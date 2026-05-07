const Anthropic = require('@anthropic-ai/sdk');
const { getSession, saveSession, deleteSession } = require('../lib/session-store');
const { chat } = require('../lib/anthropic');
const { getSofiaPrompt, getLunaPrompt } = require('../config/prompts');
const { tirarCartas, nombreCarta, detectarTema } = require('../config/cartas');
const precios = require('../config/precios.json');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const WHAPI_URL = 'https://gate.whapi.cloud';

const CUENTA = {
  alias: process.env.ALIAS || 'estudiolunatarot',
  cuit: process.env.CUIT || '23-39211722-9',
  titular: process.env.TITULAR || 'Ezequiel Mosquera'
};

const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP || '5491132851143';

// ── Formato de número ─────────────────────────────────────────────────────────

function formatNumero(numero) {
  if (!numero) return '';
  if (numero.includes('@')) return numero;
  const limpio = numero.replace(/[^0-9]/g, '');
  return `${limpio}@s.whatsapp.net`;
}

// ── Helpers de envío ──────────────────────────────────────────────────────────

async function enviarMensaje(numero, texto) {
  const to = formatNumero(numero);
  const res = await fetch(`${WHAPI_URL}/messages/text`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WHAPI_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ to, body: texto })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Whapi error: ${res.status} ${err}`);
  }
}

async function enviarMensajesMultiples(numero, respuesta) {
  const partes = respuesta
    .split('|||')
    .map(p => p.trim())
    .filter(p => p.length > 0);

  for (let i = 0; i < partes.length; i++) {
    await enviarMensaje(numero, partes[i]);
    if (i < partes.length - 1) {
      await new Promise(r => setTimeout(r, 1200));
    }
  }
}

async function enviarImagen(numero, urlImagen, caption = '') {
  const to = formatNumero(numero);
  const res = await fetch(`${WHAPI_URL}/messages/image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WHAPI_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ to, media: urlImagen, caption })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Whapi imagen error: ${res.status} ${err}`);
  }
}

function urlCarta(cartaId) {
  return `https://raw.githubusercontent.com/agustinmbanchero/luna-tarot/main/public/cartas/${cartaId}.jpg`;
}

// ── Detección de servicio con Claude ─────────────────────────────────────────

async function detectarServicioConIA(mensajeTexto) {
  const serviciosDisponibles = Object.keys(precios.servicios)
    .concat(Object.keys(precios.packs_combinados))
    .concat(Object.keys(precios.packs_preguntas));

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 50,
    messages: [{
      role: 'user',
      content: `El usuario escribió: "${mensajeTexto}"

¿Está nombrando o eligiendo EXPLÍCITAMENTE un servicio de tarot por su nombre? Solo contá como selección si el usuario dice el nombre del servicio claramente (ej: "quiero la tirada completa", "me llevo el pack claridad", "dame la tirada simple", "quiero el desbloqueo de caminos").

NO contés como selección si solo describe su situación o problema (ej: "quiero ver mi trabajo", "estoy trabado", "tengo problemas de amor").
- Si solo pregunta el precio ("cuánto sale", "qué precio tiene", "cuánto cuesta") sin expresar intención de contratarlo → respondé "ninguno"

Servicios disponibles: ${serviciosDisponibles.join(', ')}

Respondé SOLO con el key exacto (ej: "tirada_simple") o "ninguno".`
    }]
  });

  const key = response.content[0].text.trim().toLowerCase().replace(/[^a-z_]/g, '');

  const todos = {
    ...precios.servicios,
    ...precios.packs_combinados,
    ...precios.packs_preguntas
  };

  if (todos[key]) return { key, ...todos[key] };
  return null;
}

// ── Sugerir 2-3 servicios según la situación del cliente ─────────────────────

async function sugerirServiciosConIA(mensajeTexto) {
  const todos = {
    ...precios.servicios,
    ...precios.packs_combinados,
    ...precios.packs_preguntas
  };

  const lista = Object.entries(todos)
    .map(([key, val]) => `${key}: ${val.nombre} — ${val.descripcion || val.incluye || ''} ($${val.precio?.toLocaleString('es-AR')})`)
    .join('\n');

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: `La clienta describió su situación: "${mensajeTexto}"

Servicios disponibles:
${lista}

Elegí los 2 o 3 servicios MÁS relevantes para lo que describió. Si hay un pack combinado que le convenga mejor, priorizalo.

Respondé SOLO con los keys separados por coma. Ej: tirada_simple,desbloqueo_caminos`
    }]
  });

  const keys = response.content[0].text.trim().toLowerCase()
    .replace(/[^a-z_,]/g, '')
    .split(',')
    .filter(Boolean)
    .slice(0, 3);

  const resultado = keys.map(key => todos[key] ? { key, ...todos[key] } : null).filter(Boolean);
  return resultado.length > 0 ? resultado : null;
}

// ── Detectar mensaje puramente conversacional/social ─────────────────────────

async function detectarMensajeConversacional(mensajeTexto) {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 10,
    messages: [{
      role: 'user',
      content: `Mensaje: "${mensajeTexto}"
¿Este mensaje es puramente conversacional/social sin ninguna intención de consultar o contratar un servicio de tarot? (saludos de respuesta, respuestas cortas de cortesía, expresiones emocionales sin pedido concreto, chistes, comentarios casuales)
Respondé solo: si / no`
    }]
  });
  return response.content[0].text.trim().toLowerCase().startsWith('si');
}

// ── Detectar si piden ver el menú/listado de servicios ───────────────────────

async function detectarPeticionMenu(mensajeTexto) {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 10,
    messages: [{
      role: 'user',
      content: `Mensaje: "${mensajeTexto}"
¿Esta persona está pidiendo ver qué servicios/opciones hay disponibles, o pedir una lista/menú? (incluye typos y variantes como "serviciso", "que tienen", "qué ofrecen", "mostrame todo", etc.)
Respondé solo: si / no`
    }]
  });
  return response.content[0].text.trim().toLowerCase().startsWith('si');
}

// ── Clasificar intención de confirmación del cliente ─────────────────────────
// Reemplaza la detección por regex + dos Haiku calls separadas.
// Devuelve los servicios confirmados (array), o [] si no hay confirmación.

async function clasificarIntentConfirmacion(mensajeTexto, serviciosSugeridos) {
  const todosServicios = { ...precios.servicios, ...precios.packs_combinados, ...precios.packs_preguntas };

  const sugeridosLista = serviciosSugeridos.map((s, i) =>
    `${i + 1}. ${s.key}: ${s.nombre} ($${s.precio?.toLocaleString('es-AR')})`
  ).join('\n');

  const todosLista = Object.entries(todosServicios)
    .map(([k, v]) => `${k}: ${v.nombre}`)
    .join(', ');

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: `Mensaje de una clienta de un estudio de tarot:
"${mensajeTexto}"

Sofía le había sugerido:
${sugeridosLista || '(ninguno específico aún)'}

Todos los servicios disponibles: ${todosLista}

¿La clienta está CONFIRMANDO que quiere contratar? Usá criterio estricto.

SÍ CUENTA como confirmación:
• "sí quiero eso" / "me lo llevo" / "ese mismo" / "dale" / "ambos" / "los dos"
• "tomame el turno" / "agendame" / "me anoto" / "hacelo"
• Nombrar un servicio con intención clara de contratarlo: "quiero la tirada completa" / "me llevo el pack"

NO CUENTA (respondé "ninguno"):
• Pedir info: "contame", "comentame", "explicame", "qué incluye", "cuánto dura", "cómo funciona"
• Hacer preguntas: "¿y si...?", "¿cuál es mejor?", "¿qué diferencia hay?"
• Describir su situación: "es que tengo un problema con...", "me está pasando que..."
• Indecisión: "no sé", "estoy pensando", "tengo dudas", "me lo pienso"
• Pedir recomendación: "¿cuál me recomendás?", "¿qué me conviene?"

Si confirma: respondé SOLO los keys separados por coma (de los sugeridos si aplica, o del listado completo).
Si no confirma: respondé exactamente: ninguno`
    }]
  });

  const resp = response.content[0].text.trim().toLowerCase().replace(/\s/g, '');

  if (resp === 'ninguno' || resp.startsWith('ninguno')) return [];

  const keys = resp.replace(/[^a-z_,]/g, '').split(',').filter(Boolean);

  // Priorizar sugeridos; si no matchean, buscar en todos los servicios
  const matchSugeridos = serviciosSugeridos.filter(s => keys.includes(s.key));
  if (matchSugeridos.length > 0) return matchSugeridos;

  return keys
    .map(k => todosServicios[k] ? { key: k, ...todosServicios[k] } : null)
    .filter(Boolean);
}

// ── Validación de comprobante con Claude ──────────────────────────────────────

async function validarComprobante(mediaUrl, montoEsperado) {
  try {
    const response = await fetch(mediaUrl, {
      headers: { Authorization: `Bearer ${process.env.WHAPI_TOKEN}` }
    });

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    const mediaType = contentType.includes('jpeg') || contentType.includes('jpg') ? 'image/jpeg'
      : contentType.includes('png') ? 'image/png'
      : contentType.includes('webp') ? 'image/webp'
      : 'image/jpeg';

    const result = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          {
            type: 'text',
            text: `Analizá este comprobante de transferencia y respondé SOLO con JSON:
{"valido": true/false, "motivo": "string", "monto_encontrado": número_o_null}

Verificá SOLO que el monto transferido sea aproximadamente $${montoEsperado?.toLocaleString('es-AR')} (tolerancia ±$${precios.tolerancia_pago || 500}).
No importa el alias ni el CUIT destino.
Si el monto está dentro del rango → valido: true`
          }
        ]
      }]
    });

    const match = result.content[0].text.match(/\{[\s\S]*\}/);
    if (!match) return { valido: false, motivo: 'no se pudo leer el comprobante' };
    return JSON.parse(match[0]);
  } catch (err) {
    console.error('Error validando comprobante:', err);
    return { valido: false, motivo: 'error al procesar el archivo' };
  }
}

// ── Iniciar consulta de Luna ──────────────────────────────────────────────────

async function iniciarLuna(numero, session, mensajeClienteMientrasEsperaba = null) {
  session.etapa = 'con_luna';
  // Luna pide datos en su primer mensaje → cuando el cliente responda se hace la lectura directamente
  session.lunaRecopiloData = true;

  // Sofía ya recopiló los datos. Luna los confirma y pregunta si hay algo más antes de arrancar.
  const nombreMostrar = session.nombreCompleto || session.nombre || '';
  const datosTexto = [
    nombreMostrar,
    session.fechaNacimiento ? `nacida/o el ${session.fechaNacimiento}` : ''
  ].filter(Boolean).join(', ');

  const contextoTexto = session.contextoPorCliente
    ? `quiere consultar sobre: "${session.contextoPorCliente}"`
    : '';

  const prompt = getLunaPrompt({
    cartasIds: session.cartasLanzadas || [],
    nombreCliente: session.nombre,
    nombreCompleto: session.nombreCompleto,
    servicio: session.servicio,
    historialSofia: session.resumenSofia,
    contextoDadoPorCliente: session.contextoPorCliente
  });

  const base = `Presentate como Luna en una frase cálida y directa. Corroborá los datos del cliente de forma natural: "${datosTexto}". ${contextoTexto ? `Sabés que ${contextoTexto}.` : ''} Preguntá si quiere agregar algo antes de arrancar. Sin emojis. Usá ||| para separar mensajes.`;

  const instruccion = mensajeClienteMientrasEsperaba
    ? `El cliente escribió "${mensajeClienteMientrasEsperaba}" mientras esperaba. ${base}`
    : base;

  const mensajeLuna = await chat(prompt, [], instruccion);
  session.historialChat.push({ role: 'assistant', content: mensajeLuna });
  await saveSession(numero, session);
  await enviarMensajesMultiples(numero, mensajeLuna);
}

// ── Flujo principal ───────────────────────────────────────────────────────────

async function manejarMensaje(numero, mensajeTexto, tieneImagen, mediaUrl) {
  let session = await getSession(numero);

  // Reiniciar sesión solo si está trabado en pago (no cuando Luna ya está atendiendo)
  const etapasReiniciables = ['esperando_comprobante', 'verificando_pago'];
  const saludos = ['hola', 'buenas', 'buen dia', 'buenos dias', 'buenas tardes', 'buenas noches', 'hey', 'hi', 'inicio', 'empezar'];
  const textoLimpio = mensajeTexto?.toLowerCase().trim().replace(/[^a-záéíóúñü\s]/g, '') || '';

  // "reset" reinicia desde cualquier etapa (útil para testing)
  if (textoLimpio === 'reset') {
    const nombreGuardado = session.nombre || null;
    await deleteSession(numero);
    session = await getSession(numero);
    session.nombre = nombreGuardado;
    session.esClienteNuevo = false;
  } else if (saludos.some(s => textoLimpio === s || textoLimpio.startsWith(s + ' ')) && etapasReiniciables.includes(session.etapa)) {
    const nombreGuardado = session.nombre || null;
    await deleteSession(numero);
    session = await getSession(numero);
    session.nombre = nombreGuardado;
    session.esClienteNuevo = false;
  }

  // Si pasaron más de 12 horas y llega un saludo → reiniciar etapas avanzadas
  const esUnSaludo = /^(hola|buenas|buen[ao]s|hey|holis|buenas noches|buenas tardes|buenas dias|buendia)$/i.test(mensajeTexto.trim());
  const inactivoMasDe12h = session.ultimaActividad && (Date.now() - session.ultimaActividad) > 12 * 60 * 60 * 1000;
  const etapasAvanzadas = ['con_luna', 'upsell', 'esperando_luna', 'pidiendo_contexto'];
  if (esUnSaludo && inactivoMasDe12h && etapasAvanzadas.includes(session.etapa)) {
    const nombreGuardado = session.nombre || null;
    await deleteSession(numero);
    session = await getSession(numero);
    session.nombre = nombreGuardado;
    session.esClienteNuevo = false;
  }

  session.ultimaActividad = Date.now();
  session.historialChat.push({ role: 'user', content: mensajeTexto });

  let respuesta = '';

  // ── Si Luna debería haber entrado ya, la hacemos entrar (solo si pagó) ──────
  if (session.etapa === 'esperando_luna' && session.lunaDebeEscribirEn && Date.now() >= session.lunaDebeEscribirEn) {
    if (!session.montosPagados || session.montosPagados.length === 0) {
      // No pagó — volver al inicio del flujo de pago
      session.etapa = 'esperando_comprobante';
      await saveSession(numero, session);
      respuesta = `para continuar necesito que me mandes el comprobante de la transferencia 🙏`;
      session.historialChat.push({ role: 'assistant', content: respuesta });
      await saveSession(numero, session);
      await enviarMensajesMultiples(numero, respuesta);
      return '';
    }
    await saveSession(numero, session);
    await iniciarLuna(numero, session, mensajeTexto);
    return '';
  }

  switch (session.etapa) {

    // ── Bienvenida ───────────────────────────────────────────────────────────
    case 'bienvenida': {
      const prompt = getSofiaPrompt(!session.esClienteNuevo, session.nombre, true);
      respuesta = await chat(prompt, [], mensajeTexto);
      session.etapa = 'esperando_eleccion';
      break;
    }

    // ── Esperando elección de servicio ───────────────────────────────────────
    case 'esperando_eleccion': {
      // ¿Están pidiendo ver el menú/listado? (con IA para tolerar typos)
      const pidieronMenu = await detectarPeticionMenu(mensajeTexto);
      if (pidieronMenu) {
        const prompt = getSofiaPrompt(!session.esClienteNuevo, session.nombre, false, true);
        respuesta = await chat(prompt, session.historialChat.slice(0, -1), mensajeTexto);
        break;
      }

      // Primero: ¿nombró un servicio concreto? → confirmar antes de mandar el CBU
      const servicioElegido = await detectarServicioConIA(mensajeTexto);

      // Chequear si el mensaje es una pregunta de precio, no una elección real
      const esPreguntaPrecio = /cuánto|cuanto|precio|cuesta|vale|sale|costo/i.test(mensajeTexto) &&
        !/quiero|me llevo|dame|reserv|anot|contrat/i.test(mensajeTexto);

      if (servicioElegido && !esPreguntaPrecio) {
        session.serviciosSugeridos = [servicioElegido];
        session.etapa = 'confirmando_eleccion';

        const prompt = getSofiaPrompt(!session.esClienteNuevo, session.nombre, false);
        respuesta = await chat(
          prompt,
          session.historialChat.slice(0, -1),
          `La clienta mencionó "${servicioElegido.nombre}" ($${servicioElegido.precio?.toLocaleString('es-AR')}). Confirmá en 1 oración corta qué incluye y preguntale si lo quiere reservar. PROHIBIDO: mandar el alias, mandar el monto, pedir nombre, pedir contexto.`
        );
        break;
      } else if (servicioElegido && esPreguntaPrecio) {
        // Solo preguntó el precio — responder sin avanzar en el funnel
        const prompt = getSofiaPrompt(!session.esClienteNuevo, session.nombre, false, true);
        respuesta = await chat(
          prompt,
          session.historialChat.slice(0, -1),
          `La clienta preguntó el precio de "${servicioElegido.nombre}". Respondé el precio ($${servicioElegido.precio?.toLocaleString('es-AR')}) de forma natural y preguntale si le interesa. No avances al pago todavía.`
        );
        break;
      }

      // Segundo: chequear si es un mensaje puramente conversacional (sin intención de servicio)
      const esMensajeConversacional = await detectarMensajeConversacional(mensajeTexto);
      if (esMensajeConversacional) {
        const prompt = getSofiaPrompt(!session.esClienteNuevo, session.nombre, false);
        respuesta = await chat(prompt, session.historialChat.slice(0, -1), mensajeTexto);
        break;
      }

      // Tercero: describe una situación → sugerir 2-3 opciones, esperar confirmación
      const sugeridos = await sugerirServiciosConIA(mensajeTexto);
      if (sugeridos && sugeridos.length > 0) {
        session.serviciosSugeridos = sugeridos;
        session.etapa = 'confirmando_eleccion';

        const descripcionServicios = sugeridos.map(s =>
          `- *${s.nombre}*: ${s.descripcion || s.incluye || ''} → $${s.precio?.toLocaleString('es-AR')}`
        ).join('\n');

        const prompt = getSofiaPrompt(!session.esClienteNuevo, session.nombre, false);
        respuesta = await chat(
          prompt,
          session.historialChat.slice(0, -1),
          `La clienta describió: "${mensajeTexto}". Sugeríle estas opciones explicando brevemente por qué le vendrían bien:\n${descripcionServicios}\nTerminá con una pregunta corta: cuál le resuena más o si quiere combinar. PROHIBIDO ABSOLUTAMENTE: confirmar que eligió, mencionar alias, pedir pago, preguntar nombre, preguntar por Luna.`
        );
      } else {
        const prompt = getSofiaPrompt(!session.esClienteNuevo, session.nombre, false);
        respuesta = await chat(prompt, session.historialChat.slice(0, -1), mensajeTexto);
      }
      break;
    }

    // ── Confirmando elección de servicios ────────────────────────────────────
    // Sofía ya preguntó "¿lo reservamos?" — acá solo espera el sí o no del cliente.
    // El CBU se manda SOLO cuando hay confirmación explícita.
    case 'confirmando_eleccion': {
      const sugeridos = session.serviciosSugeridos || [];

      // Pre-check: palabras que SIEMPRE son confirmación, sin pasar por IA
      const esConfirmacionDirecta = /^(s[ií]|dale|ok|bueno|claro|va|vamos|perfecto|hagalo|hacelo|confirmo|anota|anotame|quiero|lo quiero|reservalo|reservame|si quiero|sí quiero)$/i.test(mensajeTexto.trim().toLowerCase().replace(/[^a-záéíóúñü\s]/g, ''));

      const seleccionados = esConfirmacionDirecta && sugeridos.length > 0
        ? sugeridos
        : await clasificarIntentConfirmacion(mensajeTexto, sugeridos);

      if (seleccionados && seleccionados.length > 0) {
        const total = seleccionados.reduce((acc, s) => acc + (s.precio || 0), 0);
        const nombresServicios = seleccionados.map(s => s.nombre).join(' + ');

        session.serviciosSeleccionados = seleccionados;
        session.servicio = nombresServicios;
        session.precioServicio = total;
        session.etapa = 'esperando_comprobante';

        const confirmacion = `perfecto, ${nombresServicios.toLowerCase()} ✨`;

        const resumenServicios = seleccionados.length > 1
          ? seleccionados.map(s => `• ${s.nombre}: $${s.precio?.toLocaleString('es-AR')}`).join('\n') + `\n*Total: $${total.toLocaleString('es-AR')}*`
          : `*Monto exacto:* $${total.toLocaleString('es-AR')}`;

        const datosPago = `para reservar tu lugar, el pago es por transferencia 🌙|||*Titular:* ${CUENTA.titular}|||*Alias:* ${CUENTA.alias}|||${resumenServicios}|||cuando hagas la transferencia mandame una captura de pantalla del comprobante ✨`;

        respuesta = `${confirmacion}|||${datosPago}`;
      } else {
        // No confirmó — chequear si mencionó un servicio diferente al sugerido
        const servicioMencionado = await detectarServicioConIA(mensajeTexto);
        if (servicioMencionado && !sugeridos.some(s => s.key === servicioMencionado.key)) {
          // La clienta pidió un servicio diferente al que se estaba confirmando → actualizar
          session.serviciosSugeridos = [servicioMencionado];
          await saveSession(numero, session);
        }

        // Sofía responde SOLO sobre los servicios sugeridos (ya actualizados si cambió).
        // PROHIBIDO: saltar al pago, pedir nombre, pedir fecha, mencionar a Luna.
        const sugeridosActuales = session.serviciosSugeridos || sugeridos;
        const prompt = getSofiaPrompt(!session.esClienteNuevo, session.nombre, false);
        const nombresYPrecios = sugeridosActuales.map(s => `${s.nombre} ($${s.precio?.toLocaleString('es-AR')})`).join(', ');
        respuesta = await chat(
          prompt,
          session.historialChat.slice(0, -1),
          `La clienta dice: "${mensajeTexto}". Le habías preguntado si quiere reservar: ${nombresYPrecios}. Respondé solo sobre eso — si pregunta algo sobre el servicio, respondé; si duda, ayudala a decidir. Terminá siempre preguntando si lo reserva. PROHIBIDO ABSOLUTAMENTE: mencionar alias, monto, pedir nombre, pedir fecha, mencionar a Luna, avanzar al pago.`
        );
      }
      break;
    }

    // ── Esperando comprobante ────────────────────────────────────────────────
    case 'esperando_comprobante': {
      if (tieneImagen && mediaUrl) {
        session.esClienteNuevo = false;

        const acks = ['recibí el comprobante', 'ya lo tengo', 'lo recibí'];
        await enviarMensaje(numero, acks[Math.floor(Math.random() * acks.length)]);
        await new Promise(r => setTimeout(r, 1000));
        await enviarMensaje(numero, `dame un segundo que lo verifico...`);

        const validacion = await validarComprobante(mediaUrl, session.precioServicio);

        if (validacion.valido) {
          session.montosPagados.push(session.precioServicio);
          await new Promise(r => setTimeout(r, 800));
          await enviarMensaje(numero, `todo perfecto, pago verificado 🌙`);
          await new Promise(r => setTimeout(r, 1000));
          if (session.nombre && session.fechaNacimiento) {
            session.etapa = 'pidiendo_contexto';
            respuesta = `¿hay algo puntual que quieras que le cuente a luna para que vaya preparando la energía?`;
          } else if (session.nombre) {
            session.etapa = 'pidiendo_fecha';
            const esCartaAstral = (session.servicio || '').toLowerCase().includes('carta_astral');
            respuesta = esCartaAstral
              ? `¿y tu fecha de nacimiento? (día, mes y año) — si tenés también la hora y la ciudad donde naciste, sumalo`
              : `¿y tu fecha de nacimiento? (día, mes y año)`;
          } else {
            session.etapa = 'pidiendo_nombre';
            respuesta = `¿me pasás tu nombre completo para avisarle a luna?`;
          }
        } else {
          try {
            await enviarMensaje(
              ADMIN_WHATSAPP,
              `⚠️ *Comprobante no validado*\nCliente: ${numero}\nServicio: ${session.servicio}\nMonto esperado: $${session.precioServicio?.toLocaleString('es-AR')}\nMotivo: ${validacion.motivo}\n\nRespondé:\n✅ APROBAR ${numero}\n❌ RECHAZAR ${numero}`
            );
          } catch (e) { console.error('Error notif admin:', e); }

          session.etapa = 'verificando_pago';
          await new Promise(r => setTimeout(r, 800));
          respuesta = `no pude leer bien el comprobante — ¿podés mandar una foto más clara con el monto visible? a veces la imagen viene con baja resolución 🙏`;
        }
      } else {
        const servicioNuevo = await detectarServicioConIA(mensajeTexto);
        if (servicioNuevo) {
          session.servicio = servicioNuevo.key;
          session.precioServicio = servicioNuevo.precio;
          const prompt = getSofiaPrompt(!session.esClienteNuevo, session.nombre, false);
          const confirmacion = await chat(
            prompt,
            session.historialChat.slice(0, -1),
            `La clienta quiere cambiar a: "${servicioNuevo.nombre || servicioNuevo.key}". Confirmalo brevemente. No preguntes el nombre. No menciones precio ni alias — el sistema los manda después.`
          );
          const datosPago = `*Titular:* ${CUENTA.titular}|||*Alias:* ${CUENTA.alias}|||*Monto exacto:* $${servicioNuevo.precio?.toLocaleString('es-AR')}|||mandame la captura cuando hagas la transferencia ✨`;
          respuesta = `${confirmacion}|||${datosPago}`;
        } else {
          const prompt = getSofiaPrompt(!session.esClienteNuevo, session.nombre, false);
          respuesta = await chat(
            prompt,
            session.historialChat.slice(0, -1),
            `El cliente dice: "${mensajeTexto}". Estás esperando que mande una captura de pantalla del comprobante de pago. Respondé naturalmente — si avisa que ya lo manda, decile que lo aguardás. No repitas las instrucciones de pago.`
          );
        }
      }
      break;
    }

    // ── Verificando pago (revisión manual admin) ─────────────────────────────
    case 'verificando_pago': {
      const esAdmin = numero === formatNumero(ADMIN_WHATSAPP);
      if (esAdmin) {
        if (mensajeTexto.toUpperCase().startsWith('APROBAR')) {
          const clienteNum = mensajeTexto.split(' ')[1];
          if (!clienteNum) {
            await enviarMensaje(numero, 'formato: APROBAR <numero> o RECHAZAR <numero>');
            return '';
          }
          const sc = await getSession(clienteNum);
          if (!sc || sc.etapa !== 'verificando_pago') {
            await enviarMensaje(numero, `no hay pago pendiente para ${clienteNum}`);
            return '';
          }
          sc.montosPagados.push(sc.precioServicio);
          const confirmaciones = ['listo, pago recibido', 'perfecto, ya está confirmado', 'todo bien con el pago'];
          const conf = confirmaciones[Math.floor(Math.random() * confirmaciones.length)];
          if (sc.nombre && sc.fechaNacimiento) {
            sc.etapa = 'pidiendo_contexto';
            await saveSession(clienteNum, sc);
            await enviarMensajesMultiples(clienteNum, `${conf}|||¿hay algo puntual que quieras que le cuente a luna para que vaya preparando la energía?`);
          } else if (sc.nombre) {
            sc.etapa = 'pidiendo_fecha';
            await saveSession(clienteNum, sc);
            const esCartaAstral = (sc.servicio || '').toLowerCase().includes('carta_astral');
            const msgFecha = esCartaAstral
              ? `${conf} ✨|||¿y tu fecha de nacimiento? (día, mes y año) — si tenés también la hora y la ciudad donde naciste, sumalo`
              : `${conf}|||¿y tu fecha de nacimiento? (día, mes y año)`;
            await enviarMensajesMultiples(clienteNum, msgFecha);
          } else {
            sc.etapa = 'pidiendo_nombre';
            await saveSession(clienteNum, sc);
            await enviarMensajesMultiples(clienteNum, `${conf} ✨|||¿me pasás tu nombre completo para avisarle a luna?`);
          }
          respuesta = `✅ aprobado. esperando nombre de ${clienteNum}`;
        } else if (mensajeTexto.toUpperCase().startsWith('RECHAZAR')) {
          const clienteNum = mensajeTexto.split(' ')[1];
          if (!clienteNum) {
            await enviarMensaje(numero, 'formato: APROBAR <numero> o RECHAZAR <numero>');
            return '';
          }
          const sc = await getSession(clienteNum);
          if (!sc || sc.etapa !== 'verificando_pago') {
            await enviarMensaje(numero, `no hay pago pendiente para ${clienteNum}`);
            return '';
          }
          sc.etapa = 'esperando_comprobante';
          await saveSession(clienteNum, sc);
          await enviarMensaje(clienteNum, `mirá, no pudimos verificar el pago 🙏 ¿podés mandar una captura con el monto exacto $${sc.precioServicio?.toLocaleString('es-AR')}?`);
          respuesta = `❌ rechazado. se pidió nuevo comprobante`;
        }
      } else {
        respuesta = `estamos verificando tu pago, en unos minutos te confirmamos 🌙`;
      }
      break;
    }

    // ── Pedir nombre completo ────────────────────────────────────────────────
    case 'pidiendo_nombre': {
      session.nombreCompleto = mensajeTexto.trim();
      session.nombre = mensajeTexto.trim().split(' ')[0]; // primer nombre para referencias de Sofía
      session.etapa = 'pidiendo_fecha';
      const esCartaAstralNombre = (session.servicio || '').toLowerCase().includes('carta_astral');
      const pedidoFecha = esCartaAstralNombre
        ? 'fecha de nacimiento (día, mes y año) — si tiene también la hora y la ciudad donde nació, que la agregue'
        : 'fecha de nacimiento (día, mes y año)';
      const prompt = getSofiaPrompt(!session.esClienteNuevo, session.nombre, false);
      respuesta = await chat(
        prompt,
        session.historialChat.slice(0, -1),
        `La clienta acaba de decir que se llama ${session.nombre} (nombre completo: ${session.nombreCompleto}). Confirmá el nombre de forma cálida y natural en una frase corta — si antes contó algo personal (una situación, un problema), referencialo brevemente. Luego pedíle su ${pedidoFecha}. Máximo 2 oraciones. Sin emoji forzado.`
      );
      break;
    }

    // ── Pedir fecha de nacimiento ────────────────────────────────────────────
    case 'pidiendo_fecha': {
      session.fechaNacimiento = mensajeTexto.trim();
      session.etapa = 'pidiendo_contexto';
      const prompt = getSofiaPrompt(!session.esClienteNuevo, session.nombre, false);
      respuesta = await chat(
        prompt,
        session.historialChat.slice(0, -1),
        `La clienta acaba de dar su fecha de nacimiento (${session.fechaNacimiento}). Confirmá brevemente que la anotaste y preguntale si hay algo puntual que quiera que le cuente a luna antes de arrancar — si antes mencionó su situación, referenciarla al preguntar ("para lo que me contabas de..."). Máximo 2 oraciones. Sin emoji forzado.`
      );
      break;
    }

    // ── Pedir contexto para Luna ─────────────────────────────────────────────
    case 'pidiendo_contexto': {
      session.contextoPorCliente = mensajeTexto;
      // Filtrar mensajes de pago (alias, monto, comprobante) — son ruido para Luna
      const esRuidoPago = (m) => {
        const t = typeof m.content === 'string' ? m.content : '';
        return /\*Alias:\*|\*Titular:\*|\*Monto|\*Total:|mandame la captura|comprobante de la transferencia|para reservar tu lugar/i.test(t);
      };
      session.resumenSofia = session.historialChat
        .slice(0, -1)
        .filter(m => !esRuidoPago(m))
        .map(m => `${m.role === 'user' ? 'Clienta' : 'Sofía'}: ${m.content}`)
        .join('\n');
      session.etapa = 'esperando_luna';

      // Delay aleatorio entre 15s y 45s — suficiente para que parezca real sin que el cliente espere mucho
      const demoraSeg = Math.floor(Math.random() * 31) + 15;
      session.lunaDebeEscribirEn = Date.now() + demoraSeg * 1000;

      const fraseEspera = [
        `perfecto, ya le aviso ✨|||luna está terminando con alguien, en un ratito escribime y te la paso 🌙`,
        `dale, le mando mensaje ahora ✨|||está cerrando una consulta, en poquito escribime y te conecto con ella 🌙`,
        `perfecto ✨|||luna está con alguien, en breve escribime y te la paso 🌙`,
        `ya le aviso ✨|||está terminando — en un momento escribime y te conecto con luna 🌙`,
      ];
      respuesta = fraseEspera[Math.floor(Math.random() * fraseEspera.length)];
      break;
    }

    // ── Esperando que Luna entre ─────────────────────────────────────────────
    case 'esperando_luna': {
      const prompt = getSofiaPrompt(!session.esClienteNuevo, session.nombre, false);
      respuesta = await chat(
        prompt,
        session.historialChat.slice(0, -1),
        `El cliente dice: "${mensajeTexto}". Luna todavía no entró. Respondé naturalmente y siempre terminá diciéndole que en un momento le escriba de nuevo para conectarla ("en un ratito escribime y te la paso", "ya falta poco, escribime en un momento"). Nunca digas que Luna va a escribir sola — el cliente tiene que mandar un mensaje para conectarse.`
      );
      break;
    }

    // ── Luna atiende ─────────────────────────────────────────────────────────
    case 'con_luna': {
      // historialConsulta = lo que el cliente quiere consultar.
      // Usamos el contexto que ya le dio a Sofía; si no hay, el primer mensaje en esta etapa.
      // Si el contexto es trivial (sí, dale, no sé), lo dejamos vacío para que Luna pregunte.
      if (!session.historialConsulta) {
        const contextoTrivial = /^(no[s]?[eé]|dale|ok|sí|si|bueno|nada|igual|todo|algo|listo|claro|bien)$/i.test((session.contextoPorCliente || '').trim());
        session.historialConsulta = (!contextoTrivial && session.contextoPorCliente) ? session.contextoPorCliente : mensajeTexto;
      }

      const necesitaCartas = session.servicio?.toLowerCase().includes('tirada') && (session.cartasLanzadas || []).length === 0;

      if (!session.lunaRecopiloData) {
        // Fallback: Luna entró sin datos recopilados (sesión antigua o edge case).
        // Corroborá lo que haya y pedí lo que falte.
        session.lunaRecopiloData = true;
        const nombreMostrar = session.nombreCompleto || session.nombre || '';
        const tieneDatos = nombreMostrar && session.fechaNacimiento;
        const prompt = getLunaPrompt({
          cartasIds: [],
          nombreCliente: session.nombre,
          nombreCompleto: session.nombreCompleto,
          servicio: session.servicio,
          historialSofia: session.resumenSofia,
          contextoDadoPorCliente: session.contextoPorCliente
        });
        if (tieneDatos) {
          const datosTexto = `${nombreMostrar}, nacida/o el ${session.fechaNacimiento}`;
          respuesta = await chat(
            prompt,
            session.historialChat.slice(0, -1),
            `La clienta dijo: "${mensajeTexto}". Corroborá sus datos de forma cálida: "${datosTexto}". Preguntá si quiere agregar algo antes de arrancar. Sin emojis.`
          );
        } else {
          const esCartaAstral = (session.servicio || '').toLowerCase().includes('carta_astral');
          const pedidoDatos = esCartaAstral
            ? 'nombre completo, fecha de nacimiento (día, mes, año), hora si la tenés, y ciudad donde naciste'
            : 'nombre completo y fecha de nacimiento (día, mes y año)';
          respuesta = await chat(
            prompt,
            session.historialChat.slice(0, -1),
            `La clienta dijo: "${mensajeTexto}". Pedíle su ${pedidoDatos} de forma conversacional. Sin emojis.`
          );
        }
      } else if (necesitaCartas && !session.cartasEnviadas) {
        // PASO 1: tirar cartas y mandarlas. La lectura se genera en el próximo mensaje.
        session.datosBiograficos = session.fechaNacimiento || mensajeTexto;
        session.agregadoContexto = mensajeTexto && mensajeTexto.trim().length > 3 && !/^(no|nada|dale|listo|ok|sí|si)$/i.test(mensajeTexto.trim())
          ? mensajeTexto : '';
        const tema = detectarTema(session.historialConsulta || mensajeTexto);
        const cantidadCartas = session.servicio?.includes('completa') ? 7 : 3;

        session.cartasLanzadas = tirarCartas(cantidadCartas, tema);
        session.cartasEnviadas = true;
        await saveSession(numero, session);

        await enviarMensaje(numero, `bien, ya tengo todo lo que necesito`);
        await new Promise(r => setTimeout(r, 800));

        for (let i = 0; i < session.cartasLanzadas.length; i++) {
          const carta = session.cartasLanzadas[i];
          try {
            await enviarImagen(numero, urlCarta(carta), nombreCarta(carta));
          } catch (e) {
            await enviarMensaje(numero, nombreCarta(carta));
          }
          if (i < session.cartasLanzadas.length - 1) {
            await new Promise(r => setTimeout(r, 800));
          }
        }

        // Pedir confirmación para arrancar — el próximo mensaje dispara la lectura
        respuesta = `mirá bien cada carta. cuando estés lista, escribime y empezamos`;

      } else if (session.cartasEnviadas && session.datosBiograficos !== 'leido') {
        // PASO 2: cliente respondió después de ver las cartas → generar la lectura
        const agregado = session.agregadoContexto ? ` También agregó: "${session.agregadoContexto}".` : '';
        const esCompleta = session.cartasLanzadas.length === 7;
        const posicionesCompleta = [
          'raíz / qué te trajo hasta acá',
          'presente / la energía actual',
          'obstáculo / lo que se cruza',
          'fortaleza / con qué contás',
          'influencias / qué viene desde afuera',
          'próximos pasos / el camino inmediato',
          'resultado / hacia dónde lleva todo'
        ];
        const posicionesSimple = ['pasado', 'presente', 'futuro'];
        const posiciones = esCompleta ? posicionesCompleta : posicionesSimple;
        const cartasConPosicion = session.cartasLanzadas
          .map((id, i) => `${i + 1}. ${posiciones[i]}: ${nombreCarta(id)}`)
          .join('\n');
        const datosClienteTirada = `${session.nombreCompleto || session.nombre || ''}, fecha de nacimiento: ${session.fechaNacimiento || 'no disponible'}`;

        const promptTirada = getLunaPrompt({
          cartasIds: session.cartasLanzadas,
          nombreCliente: session.nombre,
          nombreCompleto: session.nombreCompleto,
          servicio: session.servicio,
          historialSofia: session.resumenSofia,
          contextoDadoPorCliente: session.contextoPorCliente
        });
        try {
          const consultaEfectiva = session.historialConsulta && session.historialConsulta.trim().length > 2
            ? `"${session.historialConsulta}"`
            : 'una consulta general (no especificó tema — leé la energía general y pedíle que te cuente qué la trajo)';
          respuesta = await chat(
            promptTirada,
            session.historialChat.slice(-8),
            `Consulta de ${datosClienteTirada}. Quiere saber sobre: ${consultaEfectiva}.${agregado}\n\nCartas en posición:\n${cartasConPosicion}\n\nHacé la lectura completa siguiendo la estructura del prompt (apertura → carta por carta con su posición → síntesis → mensaje final). Sin emojis. Usá ||| para separar mensajes.`,
            4096
          );
          // Solo marcamos como leído si la lectura se generó exitosamente
          session.datosBiograficos = 'leido';
          session.etapa = 'upsell';
          await saveSession(numero, session);
        } catch (err) {
          console.error('Error generando lectura:', err.message);
          respuesta = 'dame un momento, tengo algo en la energía que necesito terminar de leer. escribime de nuevo en un ratito';
          // No guardamos cambios en sesión → el próximo mensaje reintenta la lectura
        }
      } else if (!session.datosBiograficos) {
        // Tiene datos, servicio sin tirada → lectura/servicio directo
        session.datosBiograficos = session.fechaNacimiento || mensajeTexto;
        const agregadoDirecto = mensajeTexto && mensajeTexto.trim().length > 3 && !/^(no|nada|dale|listo|ok|sí|si)$/i.test(mensajeTexto.trim())
          ? ` También agregó: "${mensajeTexto}".` : '';
        const prompt = getLunaPrompt({
          cartasIds: [],
          nombreCliente: session.nombre,
          nombreCompleto: session.nombreCompleto,
          servicio: session.servicio,
          historialSofia: session.resumenSofia,
          contextoDadoPorCliente: session.contextoPorCliente
        });
        const datosClienteDirecto = `${session.nombreCompleto || session.nombre || ''}, fecha de nacimiento: ${session.fechaNacimiento || 'no disponible'}`;
        const consultaEfectivaDirecto = session.historialConsulta && session.historialConsulta.trim().length > 2
          ? `"${session.historialConsulta}"`
          : 'una consulta general (no especificó tema — leé la energía general y pedíle que te cuente qué la trajo)';
        respuesta = await chat(
          prompt,
          session.historialChat.slice(0, -1),
          `Consulta de ${datosClienteDirecto}. Quiere saber sobre: ${consultaEfectivaDirecto}.${agregadoDirecto} Realizá el servicio contratado (${session.servicio}) usando los datos para personalizar. Estructura: apertura (energía general) → cuerpo (lo que estás trabajando) → síntesis (la frase que se llevan) → acción concreta. Mínimo 4 mensajes separados con |||. Sin emojis.`
        );
        session.etapa = 'upsell';
      } else {
        // Conversación en curso con Luna
        const prompt = getLunaPrompt({
          cartasIds: session.cartasLanzadas,
          nombreCliente: session.nombre,
          nombreCompleto: session.nombreCompleto,
          servicio: session.servicio,
          historialSofia: session.resumenSofia,
          contextoDadoPorCliente: session.contextoPorCliente
        });
        respuesta = await chat(prompt, session.historialChat.slice(0, -1), mensajeTexto);
      }
      break;
    }

    // ── Upsell post-consulta ─────────────────────────────────────────────────
    case 'upsell': {
      const prompt = getLunaPrompt({
        cartasIds: session.cartasLanzadas,
        nombreCliente: session.nombre,
        nombreCompleto: session.nombreCompleto,
        servicio: session.servicio,
        historialSofia: session.resumenSofia,
        contextoDadoPorCliente: session.contextoPorCliente
      });
      respuesta = await chat(prompt, session.historialChat.slice(0, -1), mensajeTexto);
      break;
    }

    default: {
      session.etapa = 'bienvenida';
      const prompt = getSofiaPrompt(false, null, true);
      respuesta = await chat(prompt, [], mensajeTexto);
    }
  }

  if (respuesta) {
    session.historialChat.push({ role: 'assistant', content: respuesta });
  }

  if (session.historialChat.length > 40) {
    session.historialChat = session.historialChat.slice(-40);
  }

  await saveSession(numero, session);
  return respuesta;
}

// ── Handler Vercel ────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', bot: 'Luna Tarot' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;

    // Whapi manda un array de mensajes
    const mensajes = body.messages;
    if (!mensajes || mensajes.length === 0) {
      return res.status(200).json({ status: 'ok' });
    }

    const msg = mensajes[0];

    // Ignorar mensajes propios del bot
    if (msg.from_me) return res.status(200).json({ status: 'ok' });

    const numero = msg.from; // formato: 5491112345678@s.whatsapp.net
    const tipo = msg.type;

    let mensajeTexto = '';
    let tieneImagen = false;
    let mediaUrl = null;

    if (tipo === 'text') {
      mensajeTexto = msg.text?.body || '';
    } else if (tipo === 'image') {
      tieneImagen = true;
      mediaUrl = msg.image?.link;
      mensajeTexto = msg.image?.caption || '';
    } else if (tipo === 'document') {
      tieneImagen = true;
      mediaUrl = msg.document?.link;
      mensajeTexto = msg.document?.caption || '';
    } else {
      // Tipo no manejado (sticker, audio, video, etc.)
      // Responder siempre para que la clienta no quede en silencio
      try {
        await enviarMensaje(numero, 'por acá solo puedo leer texto e imágenes — si querés contarme algo escribime un mensaje 🌙');
      } catch (e) { console.error('Error respondiendo tipo no manejado:', e); }
      return res.status(200).json({ status: 'ok' });
    }

    if (!numero || (!mensajeTexto && !tieneImagen)) {
      return res.status(200).json({ status: 'ok' });
    }

    const respuesta = await manejarMensaje(numero, mensajeTexto, tieneImagen, mediaUrl);

    if (respuesta) {
      await enviarMensajesMultiples(numero, respuesta);
    }

    res.status(200).json({ status: 'ok' });

  } catch (error) {
    console.error('Error en webhook:', error);
    res.status(200).json({ status: 'error', message: error.message });
  }
};
