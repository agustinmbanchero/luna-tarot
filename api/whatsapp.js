const twilio = require('twilio');
const Anthropic = require('@anthropic-ai/sdk');
const { getSession, saveSession, deleteSession } = require('../lib/session-store');
const { chat } = require('../lib/anthropic');
const { getSofiaPrompt, getLunaPrompt, esNoche } = require('../config/prompts');
const { tirarCartas, nombreCarta, detectarTema } = require('../config/cartas');
const precios = require('../config/precios.json');

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CUENTA = {
  alias: process.env.ALIAS || 'estudiolunatarot',
  cuit: process.env.CUIT || '23-39211722-9',
  titular: process.env.TITULAR || 'Ezequiel Mosquera'
};

const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP || '+5491132851143';

// ── Helpers de envío ──────────────────────────────────────────────────────────

function whatsappFrom() {
  const num = process.env.TWILIO_WHATSAPP_NUMBER || '';
  return num.startsWith('whatsapp:') ? num : `whatsapp:${num}`;
}

async function enviarMensaje(numero, texto) {
  await twilioClient.messages.create({
    from: whatsappFrom(),
    to: numero,
    body: texto
  });
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
  await twilioClient.messages.create({
    from: process.env.TWILIO_WHATSAPP_NUMBER,
    to: numero,
    mediaUrl: [urlImagen],
    body: caption
  });
}

function urlCarta(cartaId) {
  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.BASE_URL || 'http://localhost:3000';
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

¿Está eligiendo un servicio específico de tarot? Si sí, ¿cuál es el más probable?

Servicios disponibles: ${serviciosDisponibles.join(', ')}

Respondé SOLO con el key exacto del servicio (ej: "tirada_simple") o "ninguno" si no está eligiendo uno todavía.`
    }]
  });

  const key = response.content[0].text.trim().toLowerCase().replace(/[^a-z_]/g, '');

  // Buscar en todos los catálogos
  const todos = {
    ...precios.servicios,
    ...precios.packs_combinados,
    ...precios.packs_preguntas
  };

  if (todos[key]) return { key, ...todos[key] };
  return null;
}

// ── Validación de comprobante PDF/imagen con Claude ───────────────────────────

async function validarComprobante(mediaUrl, montoEsperado) {
  try {
    const authStr = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const response = await fetch(mediaUrl, {
      headers: { Authorization: `Basic ${authStr}` }
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

async function iniciarLuna(numero) {
  const session = await getSession(numero);
  if (session.etapa !== 'esperando_luna') return;

  session.etapa = 'con_luna';
  await saveSession(numero, session);

  const prompt = getLunaPrompt({
    cartasIds: session.cartasLanzadas || [],
    nombreCliente: session.nombre,
    servicio: session.servicio,
    historialSofia: session.resumenSofia,
    contextoDadoPorCliente: session.contextoPorCliente
  });

  const mensajeLuna = await chat(
    prompt,
    [],
    `La clienta acaba de pagar por "${session.servicio}". ${session.contextoPorCliente ? `Quiere que sepas: "${session.contextoPorCliente}".` : ''} Presentate como Luna de forma cálida y natural, y preguntale sobre qué quiere consultar. Usá ||| para separar mensajes si querés mandar varios.`
  );

  await enviarMensajesMultiples(numero, mensajeLuna);
}

// ── Flujo principal ───────────────────────────────────────────────────────────

async function manejarMensaje(numero, mensajeTexto, tieneImagen, mediaUrl) {
  let session = await getSession(numero);

  // Si el cliente saluda desde cero, reiniciar sesión conservando su nombre
  const saludos = ['hola', 'buenas', 'buen dia', 'buenos dias', 'buenas tardes', 'buenas noches', 'hey', 'hi', 'inicio', 'empezar', 'reset'];
  const textoLimpio = mensajeTexto?.toLowerCase().trim().replace(/[^a-záéíóúñü\s]/g, '') || '';
  if (saludos.some(s => textoLimpio === s || textoLimpio.startsWith(s + ' ')) && session.etapa !== 'bienvenida') {
    const nombreGuardado = session.nombre || null;
    await deleteSession(numero);
    session = await getSession(numero);
    session.nombre = nombreGuardado;
    session.esClienteNuevo = false; // es una vuelta, no cliente nuevo
  }

  session.ultimaActividad = Date.now();

  const esNuevoMensaje = session.etapa === 'bienvenida';

  // Agregar al historial
  session.historialChat.push({ role: 'user', content: mensajeTexto });

  let respuesta = '';

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
      // Intentar detectar servicio con IA
      const servicioDetectado = await detectarServicioConIA(mensajeTexto);

      if (servicioDetectado) {
        session.servicio = servicioDetectado.key;
        session.precioServicio = servicioDetectado.precio;
        session.etapa = 'confirmando_servicio';

        // Sofía confirma con su voz natural
        const prompt = getSofiaPrompt(!session.esClienteNuevo, session.nombre, false);
        const confirmacion = await chat(
          prompt,
          session.historialChat.slice(0, -1),
          `La clienta eligió: "${servicioDetectado.nombre || servicioDetectado.key}". Confirmalo con entusiasmo genuino en 1 mensaje corto. PROHIBIDO: preguntar el nombre, pedir datos personales, mencionar precio, alias o datos de pago (el sistema los manda solo).`
        );

        // Confirmación de Sofía + datos de pago separados
        const alias = CUENTA.alias;
        const datosPago = `para reservar tu lugar, el pago es por transferencia 🌙|||*Alias:* ${alias}|||*Monto exacto:* $${servicioDetectado.precio?.toLocaleString('es-AR')}|||cuando hagas la transferencia mandame una captura de pantalla del comprobante ✨`;

        respuesta = `${confirmacion}|||${datosPago}`;
        session.etapa = 'esperando_comprobante';
      } else {
        // Sofía ayuda a elegir con contexto completo
        const prompt = getSofiaPrompt(!session.esClienteNuevo, session.nombre, false);
        respuesta = await chat(prompt, session.historialChat.slice(0, -1), mensajeTexto);
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
          session.etapa = 'pidiendo_nombre';

          await new Promise(r => setTimeout(r, 800));
          await enviarMensaje(numero, `todo perfecto, pago verificado 🌙`);
          await new Promise(r => setTimeout(r, 1000));
          respuesta = `¿cómo te llamo para avisarle a luna?`;
        } else {
          // Notificar admin para revisión manual
          try {
            await enviarMensaje(
              `whatsapp:${ADMIN_WHATSAPP}`,
              `⚠️ *Comprobante no validado*\nCliente: ${numero}\nServicio: ${session.servicio}\nMonto esperado: $${session.precioServicio?.toLocaleString('es-AR')}\nMotivo: ${validacion.motivo}\n\nRespondé:\n✅ APROBAR ${numero}\n❌ RECHAZAR ${numero}`
            );
          } catch (e) { console.error('Error notif admin:', e); }

          session.etapa = 'verificando_pago';
          await new Promise(r => setTimeout(r, 800));
          respuesta = `hmm, no pude verificar el monto 🙏|||asegurate de mandar una captura de pantalla del comprobante con el monto de $${session.precioServicio?.toLocaleString('es-AR')}`;
        }
      } else {
        // Ver si quiere cambiar de servicio
        const servicioNuevo = await detectarServicioConIA(mensajeTexto);
        if (servicioNuevo) {
          // Cambiar servicio y mostrar nuevos datos de pago
          session.servicio = servicioNuevo.key;
          session.precioServicio = servicioNuevo.precio;
          const prompt = getSofiaPrompt(!session.esClienteNuevo, session.nombre, false);
          const confirmacion = await chat(
            prompt,
            session.historialChat.slice(0, -1),
            `La clienta quiere cambiar a: "${servicioNuevo.nombre || servicioNuevo.key}". Confirmalo brevemente. No preguntes el nombre. No menciones precio ni alias — el sistema los manda después.`
          );
          const alias = CUENTA.alias;
          const datosPago = `*Alias:* ${alias}|||*Monto exacto:* $${servicioNuevo.precio?.toLocaleString('es-AR')}|||mandame la captura cuando hagas la transferencia ✨`;
          respuesta = `${confirmacion}|||${datosPago}`;
        } else {
          // Responder con naturalidad
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
      const esAdmin = numero === `whatsapp:${ADMIN_WHATSAPP}`;
      if (esAdmin) {
        if (mensajeTexto.toUpperCase().startsWith('APROBAR')) {
          const clienteNum = mensajeTexto.split(' ')[1];
          const sc = await getSession(clienteNum);
          sc.etapa = 'pidiendo_nombre';
          sc.montosPagados.push(sc.precioServicio);
          await saveSession(clienteNum, sc);
          await enviarMensajesMultiples(clienteNum, `pago confirmado ✨|||¿cómo te llamo para avisarle a luna?`);
          respuesta = `✅ aprobado. esperando nombre de ${clienteNum}`;
        } else if (mensajeTexto.toUpperCase().startsWith('RECHAZAR')) {
          const clienteNum = mensajeTexto.split(' ')[1];
          const sc = await getSession(clienteNum);
          sc.etapa = 'esperando_comprobante';
          await saveSession(clienteNum, sc);
          await enviarMensaje(clienteNum, `mirá, no pudimos verificar el pago 🙏 ¿podés mandar una captura de pantalla del comprobante con el alias *${CUENTA.alias}* y el monto exacto $${sc.precioServicio?.toLocaleString('es-AR')}?`);
          respuesta = `❌ rechazado. se pidió nuevo comprobante`;
        }
      } else {
        respuesta = `estamos verificando tu pago, en unos minutos te confirmamos 🌙`;
      }
      break;
    }

    // ── Pedir nombre ─────────────────────────────────────────────────────────
    case 'pidiendo_nombre': {
      session.nombre = mensajeTexto.trim().split(' ')[0]; // Solo el primer nombre
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

      // Delay aleatorio entre 30s y 3 minutos para dar credibilidad
      const demoraSeg = Math.floor(Math.random() * (180 - 30 + 1)) + 30;
      session.lunaDebeEscribirEn = Date.now() + demoraSeg * 1000;

      const fraseEspera = [
        `perfecto, ya le aviso ✨|||luna está terminando con una consulta, en un ratito te escribe ella directamente 🌙`,
        `dale, le mando mensaje ahora ✨|||luna está con alguien, en poquito te contacta ella 🌙`,
        `perfecto ✨|||luna está cerrando una lectura, ya te escribe directamente 🌙`,
        `ya le aviso a luna ✨|||está terminando con alguien, en un momento te escribe ella 🌙`,
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
        `El cliente dice: "${mensajeTexto}". Luna todavía no entró a la conversación, está terminando con otra persona. Respondé naturalmente según lo que dijo — si pregunta cuánto falta, tranquilizalo con calidez; si está impaciente, reconocé la espera. No repitas siempre la misma frase.`
      );
      break;
    }

    // ── Luna atiende ─────────────────────────────────────────────────────────
    case 'con_luna': {
      if (!session.historialConsulta) {
        session.historialConsulta = mensajeTexto;
      }

      const tema = detectarTema(mensajeTexto);
      const necesitaCartas = session.servicio?.includes('tirada') && session.cartasLanzadas.length === 0;

      if (necesitaCartas) {
        const cantidadCartas = session.servicio === 'tirada_completa' ? 7 : 3;
        session.cartasLanzadas = tirarCartas(cantidadCartas, tema);

        await enviarMensaje(numero, `dame un ratito que me concentro... 🌙`);
        await new Promise(r => setTimeout(r, 3000));

        for (let i = 0; i < session.cartasLanzadas.length; i++) {
          const carta = session.cartasLanzadas[i];
          try {
            await enviarImagen(numero, urlCarta(carta), nombreCarta(carta));
          } catch (e) {
            await enviarMensaje(numero, `🔮 ${nombreCarta(carta)}`);
          }
          if (i < session.cartasLanzadas.length - 1) {
            await new Promise(r => setTimeout(r, 2000));
          }
        }

        const prompt = getLunaPrompt({
          cartasIds: session.cartasLanzadas,
          nombreCliente: session.nombre,
          servicio: session.servicio,
          historialSofia: session.resumenSofia,
          contextoDadoPorCliente: session.contextoPorCliente
        });

        const nombresCartas = session.cartasLanzadas.map(nombreCarta);
        respuesta = await chat(
          prompt,
          session.historialChat.slice(0, -1),
          `La clienta pregunta: "${mensajeTexto}". Las cartas que salieron son: ${nombresCartas.join(', ')}. Hacé la lectura completa, conectando las cartas entre sí. Usá ||| para separar en mensajes cortos.`
        );
        session.etapa = 'upsell';
      } else {
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
    const numero = body.From;
    const mensajeTexto = body.Body || '';
    const tieneImagen = body.NumMedia && parseInt(body.NumMedia) > 0;
    const mediaUrl = body.MediaUrl0 || null;

    if (!numero) return res.status(400).send('');

    const respuesta = await manejarMensaje(numero, mensajeTexto, tieneImagen, mediaUrl);

    if (respuesta) {
      await enviarMensajesMultiples(numero, respuesta);
    }

    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send('<Response></Response>');

  } catch (error) {
    console.error('Error en webhook:', error);
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send('<Response></Response>');
  }
};
