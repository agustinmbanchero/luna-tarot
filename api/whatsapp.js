const Anthropic = require('@anthropic-ai/sdk');
const { getSession, saveSession } = require('../lib/session-store');
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

¿Está eligiendo un servicio específico de tarot? Si sí, ¿cuál es el más probable?

Servicios disponibles: ${serviciosDisponibles.join(', ')}

Respondé SOLO con el key exacto del servicio (ej: "tirada_simple") o "ninguno" si no está eligiendo uno todavía.`
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

// ── Validación de comprobante con Claude ──────────────────────────────────────

async function validarComprobante(mediaUrl, montoEsperado) {
  try {
    // Descargar el archivo (Whapi requiere el token)
    const response = await fetch(mediaUrl, {
      headers: { Authorization: `Bearer ${process.env.WHAPI_TOKEN}` }
    });

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mediaType = contentType.includes('pdf') ? 'application/pdf' : contentType;

    const result = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: mediaType, data: base64 } },
          {
            type: 'text',
            text: `Analizá este comprobante de transferencia y respondé SOLO con JSON:
{"valido": true/false, "motivo": "string", "monto_encontrado": número_o_null, "alias_encontrado": true/false, "cuit_encontrado": true/false}

Verificá que contenga:
- Alias destino: "${CUENTA.alias}"
- CUIT/CUIL: "${CUENTA.cuit}" (o ${CUENTA.cuit.replace(/-/g, '')})
- Monto: $${montoEsperado?.toLocaleString('es-AR')} (tolerancia ±$${precios.tolerancia_pago || 100})

Si falta cualquiera → valido: false`
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
  const session = await getSession(numero);
  session.ultimaActividad = Date.now();

  session.historialChat.push({ role: 'user', content: mensajeTexto });

  let respuesta = '';

  switch (session.etapa) {

    case 'bienvenida': {
      const prompt = getSofiaPrompt(!session.esClienteNuevo, session.nombre, true);
      respuesta = await chat(prompt, [], mensajeTexto);
      session.etapa = 'esperando_eleccion';
      break;
    }

    case 'esperando_eleccion': {
      const servicioDetectado = await detectarServicioConIA(mensajeTexto);

      if (servicioDetectado) {
        session.servicio = servicioDetectado.key;
        session.precioServicio = servicioDetectado.precio;

        const prompt = getSofiaPrompt(!session.esClienteNuevo, session.nombre, false);
        const confirmacion = await chat(
          prompt,
          session.historialChat.slice(0, -1),
          `La clienta eligió: "${servicioDetectado.nombre || servicioDetectado.key}". Confirmalo con tu voz natural y entusiasmo genuino (1 mensaje corto). No menciones el precio ni los datos de pago — eso lo manda el sistema automáticamente después.`
        );

        const datosPago = `para reservar tu lugar, el pago es por transferencia 🌙|||*Alias:* ${CUENTA.alias}|||*Monto exacto:* $${servicioDetectado.precio?.toLocaleString('es-AR')}|||cuando hagas la transferencia mandame el PDF del comprobante — desde tu app bancaria usá "compartir comprobante" ✨`;

        respuesta = `${confirmacion}|||${datosPago}`;
        session.etapa = 'esperando_comprobante';
      } else {
        const prompt = getSofiaPrompt(!session.esClienteNuevo, session.nombre, false);
        respuesta = await chat(prompt, session.historialChat.slice(0, -1), mensajeTexto);
      }
      break;
    }

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
          try {
            await enviarMensaje(
              ADMIN_WHATSAPP,
              `⚠️ *Comprobante no validado*\nCliente: ${numero}\nServicio: ${session.servicio}\nMonto esperado: $${session.precioServicio?.toLocaleString('es-AR')}\nMotivo: ${validacion.motivo}\n\nRespondé:\n✅ APROBAR ${numero}\n❌ RECHAZAR ${numero}`
            );
          } catch (e) { console.error('Error notif admin:', e); }

          session.etapa = 'verificando_pago';
          await new Promise(r => setTimeout(r, 800));
          respuesta = `hmm, no pude verificar algunos datos 🙏|||asegurate de mandar el PDF desde "compartir comprobante" en tu app, con el alias *${CUENTA.alias}* y el monto exacto de $${session.precioServicio?.toLocaleString('es-AR')}`;
        }
      } else {
        respuesta = `para verificar el pago necesito el PDF del comprobante 📄|||desde tu app bancaria usá "compartir comprobante" y mandámelo por acá`;
      }
      break;
    }

    case 'verificando_pago': {
      const esAdmin = numero === formatNumero(ADMIN_WHATSAPP);
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
          await enviarMensaje(clienteNum, `mirá, no pudimos verificar el pago 🙏 ¿podés mandar el PDF del comprobante con el alias *${CUENTA.alias}* y el monto exacto $${sc.precioServicio?.toLocaleString('es-AR')}?`);
          respuesta = `❌ rechazado. se pidió nuevo comprobante`;
        }
      } else {
        respuesta = `estamos verificando tu pago, en unos minutos te confirmamos 🌙`;
      }
      break;
    }

    case 'pidiendo_nombre': {
      session.nombre = mensajeTexto.trim().split(' ')[0];
      session.etapa = 'pidiendo_contexto';
      respuesta = `un gusto, ${session.nombre} 🌙|||¿hay algo puntual que quieras que le cuente a luna para que vaya preparando la energía?`;
      break;
    }

    case 'pidiendo_contexto': {
      session.contextoPorCliente = mensajeTexto;
      session.resumenSofia = session.historialChat
        .slice(0, -1)
        .map(m => `${m.role === 'user' ? 'Clienta' : 'Sofía'}: ${m.content}`)
        .join('\n');
      session.etapa = 'esperando_luna';

      respuesta = `perfecto, ya le aviso ✨|||luna está terminando con alguien, en 3 minutitos te escribe ella directamente 🌙`;
      setTimeout(() => iniciarLuna(numero), 3 * 60 * 1000);
      break;
    }

    case 'esperando_luna': {
      respuesta = `luna está por escribirte, un momentito más 🌙`;
      break;
    }

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
      // Tipo no manejado (sticker, audio, etc.)
      return res.status(200).json({ status: 'ok' });
    }

    if (!numero || !mensajeTexto && !tieneImagen) {
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
