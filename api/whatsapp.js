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
  await fetch(`${WHAPI_URL}/messages/image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WHAPI_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ to, media: urlImagen, caption })
  });
}

function urlCarta(cartaId) {
  const base = process.env.BASE_URL || 'https://luna-tarot-liart.vercel.app';
  return `${base}/public/cartas/${cartaId}.jpg`;
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

// ── Detectar cuáles servicios confirmó el cliente ────────────────────────────

async function detectarServiciosSeleccionados(mensajeTexto, serviciosSugeridos) {
  const lista = serviciosSugeridos.map((s, i) =>
    `${i + 1}. ${s.key}: ${s.nombre} ($${s.precio?.toLocaleString('es-AR')})`
  ).join('\n');

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: `La clienta dijo: "${mensajeTexto}"

Los servicios que se le ofrecieron:
${lista}

¿Cuáles está eligiendo? Respondé SOLO con los keys separados por coma, o "todos" si quiere todos, o "ninguno" si todavía no confirmó ninguno.`
    }]
  });

  const resp = response.content[0].text.trim().toLowerCase().replace(/\s/g, '');

  if (resp.includes('todos')) return serviciosSugeridos;
  if (resp.includes('ninguno')) return [];

  const keys = resp.replace(/[^a-z_,]/g, '').split(',').filter(Boolean);
  return serviciosSugeridos.filter(s => keys.includes(s.key));
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
  await saveSession(numero, session);

  const prompt = getLunaPrompt({
    cartasIds: session.cartasLanzadas || [],
    nombreCliente: session.nombre,
    servicio: session.servicio,
    historialSofia: session.resumenSofia,
    contextoDadoPorCliente: session.contextoPorCliente
  });

  const contextoConocido = session.contextoPorCliente
    ? `Ya sabés que quiere: "${session.contextoPorCliente}".`
    : session.resumenSofia
      ? `Ya hablaste con Sofía y sabés el contexto.`
      : '';

  const instruccion = mensajeClienteMientrasEsperaba
    ? `El cliente escribió "${mensajeClienteMientrasEsperaba}" mientras esperaba. ${contextoConocido} Empezá con algo breve tipo "disculpá la demora" sin drama, presentate como Luna, y arrancá directo con la consulta usando el contexto que ya tenés — NO preguntes qué lo trajo ni qué quiere saber, ya lo sabés. Sin emojis. Usá ||| para separar mensajes.`
    : `Presentate como Luna de forma cálida. ${contextoConocido} Arrancá directo con la consulta usando el contexto que ya tenés — NO preguntes qué lo trajo ni qué quiere saber, ya lo sabés. Sin emojis. Usá ||| para separar mensajes.`;

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
  const saludos = ['hola', 'buenas', 'buen dia', 'buenos dias', 'buenas tardes', 'buenas noches', 'hey', 'hi', 'inicio', 'empezar', 'reset'];
  const textoLimpio = mensajeTexto?.toLowerCase().trim().replace(/[^a-záéíóúñü\s]/g, '') || '';
  if (saludos.some(s => textoLimpio === s || textoLimpio.startsWith(s + ' ')) && etapasReiniciables.includes(session.etapa)) {
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
      // Si está pidiendo el menú/listado, Sofía lo muestra directo
      const pidieronMenu = /list[ao]|menú|menu|todo[s]? lo que|qué tienen|que tienen|ver todo|todas las opciones|opciones|todo lo|dame todo|mostrame todo/i.test(mensajeTexto);
      if (pidieronMenu) {
        const prompt = getSofiaPrompt(!session.esClienteNuevo, session.nombre, false);
        respuesta = await chat(prompt, session.historialChat.slice(0, -1), mensajeTexto);
        break;
      }

      // Primero: ¿eligió un servicio concreto? → pago directo por código
      const servicioElegido = await detectarServicioConIA(mensajeTexto);
      if (servicioElegido) {
        session.servicio = servicioElegido.key;
        session.precioServicio = servicioElegido.precio;
        session.etapa = 'esperando_comprobante';

        const prompt = getSofiaPrompt(!session.esClienteNuevo, session.nombre, false);
        const confirmacion = await chat(
          prompt,
          session.historialChat.slice(0, -1),
          `La clienta eligió: "${servicioElegido.nombre}". Confirmalo en 1 oración corta y entusiasta. PROHIBIDO: pedir nombre, pedir contexto, preguntar por Luna, mencionar precio o alias.`
        );
        const datosPago = `para reservar tu lugar, el pago es por transferencia 🌙|||*Alias:* ${CUENTA.alias}|||*Monto exacto:* $${servicioElegido.precio?.toLocaleString('es-AR')}|||cuando hagas la transferencia mandame una captura de pantalla del comprobante ✨`;
        respuesta = `${confirmacion}|||${datosPago}`;
        break;
      }

      // Segundo: describe una situación → sugerir 2-3 opciones, esperar confirmación
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
    case 'confirmando_eleccion': {
      const sugeridos = session.serviciosSugeridos || [];

      // Si pide el menú completo, Sofía lo muestra y volvemos a esperar elección
      const pidieronMenu = /list[ao]|menú|menu|todo[s]? lo que|qué tienen|que tienen|ver todo|todas las opciones|opciones|todo lo|dame todo|mostrame todo/i.test(mensajeTexto);
      if (pidieronMenu) {
        session.etapa = 'esperando_eleccion';
        const prompt = getSofiaPrompt(!session.esClienteNuevo, session.nombre, false);
        respuesta = await chat(prompt, session.historialChat.slice(0, -1), mensajeTexto);
        break;
      }

      // Primero: ¿nombró un servicio concreto por nombre? → ignorar sugeridos, usar ese
      const servicioExplicito = await detectarServicioConIA(mensajeTexto);
      if (servicioExplicito) {
        session.servicio = servicioExplicito.key;
        session.precioServicio = servicioExplicito.precio;
        session.etapa = 'esperando_comprobante';
        const prompt = getSofiaPrompt(!session.esClienteNuevo, session.nombre, false);
        const confirmacion = await chat(
          prompt,
          session.historialChat.slice(0, -1),
          `La clienta eligió: "${servicioExplicito.nombre}". Confirmalo en 1 oración corta y entusiasta. PROHIBIDO: pedir nombre, pedir contexto, preguntar por Luna, mencionar precio o alias.`
        );
        const datosPago = `para reservar tu lugar, el pago es por transferencia 🌙|||*Alias:* ${CUENTA.alias}|||*Monto exacto:* $${servicioExplicito.precio?.toLocaleString('es-AR')}|||cuando hagas la transferencia mandame una captura de pantalla del comprobante ✨`;
        respuesta = `${confirmacion}|||${datosPago}`;
        break;
      }

      const seleccionados = await detectarServiciosSeleccionados(mensajeTexto, sugeridos);

      if (seleccionados && seleccionados.length > 0) {
        const total = seleccionados.reduce((acc, s) => acc + (s.precio || 0), 0);
        const nombresServicios = seleccionados.map(s => s.nombre).join(' + ');

        session.serviciosSeleccionados = seleccionados;
        session.servicio = nombresServicios;
        session.precioServicio = total;
        session.etapa = 'esperando_comprobante';

        // Confirmación por código para evitar que Sofía diga el servicio equivocado
        const confirmacion = `perfecto, ${nombresServicios.toLowerCase()} ✨`;

        const resumenServicios = seleccionados.length > 1
          ? seleccionados.map(s => `• ${s.nombre}: $${s.precio?.toLocaleString('es-AR')}`).join('\n') + `\n*Total: $${total.toLocaleString('es-AR')}*`
          : `*Monto exacto:* $${total.toLocaleString('es-AR')}`;

        const datosPago = `para reservar tu lugar, el pago es por transferencia 🌙|||*Alias:* ${CUENTA.alias}|||${resumenServicios}|||cuando hagas la transferencia mandame una captura de pantalla del comprobante ✨`;

        respuesta = `${confirmacion}|||${datosPago}`;
      } else {
        // No confirmó nada todavía, seguir conversando
        const prompt = getSofiaPrompt(!session.esClienteNuevo, session.nombre, false);
        respuesta = await chat(
          prompt,
          session.historialChat.slice(0, -1),
          `La clienta dice: "${mensajeTexto}". Estás esperando que confirme qué servicio(s) quiere de los que le ofreciste: ${sugeridos.map(s => s.nombre).join(', ')}. Respondé naturalmente según lo que dijo.`
        );
      }
      break;
    }

    // ── Esperando comprobante ────────────────────────────────────────────────
    case 'esperando_comprobante': {
      if (tieneImagen && mediaUrl) {
        session.esClienteNuevo = false;

        await enviarMensaje(numero, `recibí el comprobante ✨`);
        await new Promise(r => setTimeout(r, 1000));
        await enviarMensaje(numero, `dame un segundo que lo verifico...`);

        const validacion = await validarComprobante(mediaUrl, session.precioServicio);

        if (validacion.valido) {
          session.montosPagados.push(session.precioServicio);
          await new Promise(r => setTimeout(r, 800));
          await enviarMensaje(numero, `todo perfecto, pago verificado 🌙`);
          await new Promise(r => setTimeout(r, 1000));
          if (session.nombre) {
            session.etapa = 'pidiendo_contexto';
            respuesta = `¿hay algo puntual que quieras que le cuente a luna para que vaya preparando la energía?`;
          } else {
            session.etapa = 'pidiendo_nombre';
            respuesta = `¿cómo te llamo para avisarle a luna?`;
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
          respuesta = `hmm, no pude verificar el monto 🙏|||asegurate de mandar una captura de pantalla del comprobante con el monto de $${session.precioServicio?.toLocaleString('es-AR')}`;
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
          const datosPago = `*Alias:* ${CUENTA.alias}|||*Monto exacto:* $${servicioNuevo.precio?.toLocaleString('es-AR')}|||mandame la captura cuando hagas la transferencia ✨`;
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
          const sc = await getSession(clienteNum);
          sc.montosPagados.push(sc.precioServicio);
          if (sc.nombre) {
            sc.etapa = 'pidiendo_contexto';
            await saveSession(clienteNum, sc);
            await enviarMensajesMultiples(clienteNum, `pago confirmado ✨|||¿hay algo puntual que quieras que le cuente a luna para que vaya preparando la energía?`);
          } else {
            sc.etapa = 'pidiendo_nombre';
            await saveSession(clienteNum, sc);
            await enviarMensajesMultiples(clienteNum, `pago confirmado ✨|||¿cómo te llamo para avisarle a luna?`);
          }
          respuesta = `✅ aprobado. esperando nombre de ${clienteNum}`;
        } else if (mensajeTexto.toUpperCase().startsWith('RECHAZAR')) {
          const clienteNum = mensajeTexto.split(' ')[1];
          const sc = await getSession(clienteNum);
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

    // ── Pedir nombre ─────────────────────────────────────────────────────────
    case 'pidiendo_nombre': {
      session.nombre = mensajeTexto.trim().split(' ')[0];
      session.etapa = 'pidiendo_contexto';
      respuesta = `un gusto, ${session.nombre} 🌙|||¿hay algo puntual que quieras que le cuente a luna para que vaya preparando la energía?`;
      break;
    }

    // ── Pedir contexto para Luna ─────────────────────────────────────────────
    case 'pidiendo_contexto': {
      session.contextoPorCliente = mensajeTexto;
      session.resumenSofia = session.historialChat
        .slice(0, -1)
        .map(m => `${m.role === 'user' ? 'Clienta' : 'Sofía'}: ${m.content}`)
        .join('\n');
      session.etapa = 'esperando_luna';

      // Delay aleatorio entre 30s y 2 minutos
      const demoraSeg = Math.floor(Math.random() * 91) + 30;
      session.lunaDebeEscribirEn = Date.now() + demoraSeg * 1000;

      const fraseEspera = [
        `perfecto, ya le aviso ✨|||luna está terminando con una consulta — en 1 o 2 minutos escribime cualquier cosa y te la paso directamente 🌙`,
        `dale, le mando mensaje ahora ✨|||está cerrando con alguien, en un ratito escribime y te conecto con ella 🌙`,
        `perfecto ✨|||luna está en una lectura, en poquito escribime y te la paso 🌙`,
        `ya le aviso ✨|||está terminando con alguien — en un momento escribime y te conecto con luna 🌙`,
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
      if (!session.historialConsulta) {
        session.historialConsulta = mensajeTexto;
      }

      const necesitaCartas = session.servicio?.toLowerCase().includes('tirada') && (session.cartasLanzadas || []).length === 0;

      if (!session.lunaRecopiloData) {
        // PASO 1 (todos los servicios): Luna pide datos biográficos
        session.lunaRecopiloData = true;
        const prompt = getLunaPrompt({
          cartasIds: [],
          nombreCliente: session.nombre,
          servicio: session.servicio,
          historialSofia: session.resumenSofia,
          contextoDadoPorCliente: session.contextoPorCliente
        });
        respuesta = await chat(
          prompt,
          session.historialChat.slice(0, -1),
          `La clienta dijo: "${mensajeTexto}". Pedíle sus datos de forma natural para personalizar la lectura: fecha de nacimiento (día, mes, año) y signo si lo sabe. Un solo mensaje corto, conversacional. Sin emojis.`
        );
      } else if (necesitaCartas) {
        // PASO 2a: tiene datos, servicio con tirada → tirar cartas y leer
        session.datosBiograficos = mensajeTexto;
        const tema = detectarTema(session.historialConsulta || mensajeTexto);
        const cantidadCartas = session.servicio?.includes('completa') ? 7 : 3;

        // Guardar cartas inmediatamente para evitar duplicados por mensajes simultáneos
        session.cartasLanzadas = tirarCartas(cantidadCartas, tema);
        await saveSession(numero, session);

        await enviarMensaje(numero, `bien, ya tengo todo lo que necesito`);
        await new Promise(r => setTimeout(r, 2000));

        for (let i = 0; i < session.cartasLanzadas.length; i++) {
          const carta = session.cartasLanzadas[i];
          try {
            await enviarImagen(numero, urlCarta(carta), nombreCarta(carta));
          } catch (e) {
            await enviarMensaje(numero, nombreCarta(carta));
          }
          if (i < session.cartasLanzadas.length - 1) {
            await new Promise(r => setTimeout(r, 2000));
          }
        }

        const promptTirada = getLunaPrompt({
          cartasIds: session.cartasLanzadas,
          nombreCliente: session.nombre,
          servicio: session.servicio,
          historialSofia: session.resumenSofia,
          contextoDadoPorCliente: session.contextoPorCliente
        });
        const nombresCartas = session.cartasLanzadas.map(nombreCarta);
        respuesta = await chat(
          promptTirada,
          session.historialChat.slice(0, -1),
          `La clienta consulta: "${session.historialConsulta}". Sus datos: "${mensajeTexto}". Cartas: ${nombresCartas.join(', ')}. Hacé la lectura completa conectando las cartas. Sin emojis. Usá ||| para separar mensajes.`
        );
        session.etapa = 'upsell';
      } else if (!session.datosBiograficos) {
        // PASO 2b: tiene datos, servicio sin tirada → hacer la lectura/servicio directamente
        session.datosBiograficos = mensajeTexto;
        const prompt = getLunaPrompt({
          cartasIds: [],
          nombreCliente: session.nombre,
          servicio: session.servicio,
          historialSofia: session.resumenSofia,
          contextoDadoPorCliente: session.contextoPorCliente
        });
        respuesta = await chat(
          prompt,
          session.historialChat.slice(0, -1),
          `La clienta consulta: "${session.historialConsulta}". Sus datos: "${mensajeTexto}". Comenzá con el servicio contratado (${session.servicio}), incorporando los datos para personalizar. Sin emojis. Usá ||| para separar mensajes.`
        );
        session.etapa = 'upsell';
      } else {
        // Conversación en curso con Luna
        const prompt = getLunaPrompt({
          cartasIds: session.cartasLanzadas,
          nombreCliente: session.nombre,
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
