const twilio = require('twilio');
const Anthropic = require('@anthropic-ai/sdk');
const { getSession, saveSession } = require('../lib/session-store');
const { chat } = require('../lib/anthropic');
const { getSofiaPrompt, getLunaPrompt } = require('../config/prompts');
const { tirarCartas, nombreCarta, detectarTema } = require('../config/cartas');
const precios = require('../config/precios.json');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Datos de la cuenta receptora — usados para validar comprobantes
const CUENTA = {
  alias: process.env.ALIAS || 'estudiolunatarot',
  cuit: process.env.CUIT || '23-39211722-9',
  titular: process.env.TITULAR || 'Ezequiel Mosquera'
};

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : process.env.BASE_URL || 'http://localhost:3000';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function enviarMensaje(numero, texto) {
  await twilioClient.messages.create({
    from: process.env.TWILIO_WHATSAPP_NUMBER,
    to: numero,
    body: texto
  });
}

// Envía múltiples mensajes cortos con delay entre ellos
// Claude separa los mensajes con |||
async function enviarMensajesMultiples(numero, respuesta) {
  const partes = respuesta
    .split('|||')
    .map(p => p.trim())
    .filter(p => p.length > 0);

  for (let i = 0; i < partes.length; i++) {
    await enviarMensaje(numero, partes[i]);
    if (i < partes.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
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

// Valida el comprobante PDF/imagen usando Claude Vision
async function validarComprobante(mediaUrl, montoEsperado) {
  try {
    // Descargar el archivo de Twilio
    const authStr = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const response = await fetch(mediaUrl, {
      headers: { Authorization: `Basic ${authStr}` }
    });

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    // Determinar tipo de media para Claude
    const mediaType = contentType.includes('pdf') ? 'application/pdf' : contentType;

    const result = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: mediaType, data: base64 }
          },
          {
            type: 'text',
            text: `Analizá este comprobante de transferencia bancaria y respondé SOLO con JSON:
{
  "valido": true/false,
  "motivo": "explicación breve",
  "monto_encontrado": número o null,
  "alias_encontrado": true/false,
  "cuit_encontrado": true/false
}

Verificá que contenga:
- Alias destino: "${CUENTA.alias}" (o variante similar)
- CUIT/CUIL: "${CUENTA.cuit}" (o el número sin guiones: ${CUENTA.cuit.replace(/-/g, '')})
- Monto: $${montoEsperado.toLocaleString('es-AR')} (tolerancia ±$${precios.tolerancia_pago || 100})

Si falta alguno de los tres → valido: false`
          }
        ]
      }]
    });

    const texto = result.content[0].text;
    const jsonMatch = texto.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { valido: false, motivo: 'no se pudo leer el comprobante' };

    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('Error validando comprobante:', err);
    return { valido: false, motivo: 'error al procesar el archivo' };
  }
}

function urlCarta(cartaId) {
  return `${BASE_URL}/public/cartas/${cartaId}.jpg`;
}

function detectarServicio(texto) {
  const t = texto.toLowerCase();
  const s = precios.servicios;
  const pc = precios.packs_combinados;
  const pp = precios.packs_preguntas;

  if (t.includes('pregunta puntual') || t.includes('pregunta')) return { key: 'pregunta_puntual', ...s.pregunta_puntual };
  if (t.includes('tirada completa') || t.includes('7 cartas')) return { key: 'tirada_completa', ...s.tirada_completa };
  if (t.includes('tirada simple') || t.includes('3 cartas')) return { key: 'tirada_simple', ...s.tirada_simple };
  if (t.includes('desbloqueo')) return { key: 'desbloqueo_caminos', ...s.desbloqueo_caminos };
  if (t.includes('corte de lazos') || t.includes('corte lazos')) return { key: 'corte_lazos', ...s.corte_lazos };
  if (t.includes('proteccion amor') || t.includes('protección amor')) return { key: 'proteccion_amor', ...s.proteccion_amor };
  if (t.includes('proteccion econom') || t.includes('protección econom')) return { key: 'proteccion_economica', ...s.proteccion_economica };
  if (t.includes('carta astral')) return { key: 'carta_astral', ...s.carta_astral };
  if (t.includes('pack claridad')) return { key: 'pack_claridad', ...pc.pack_claridad };
  if (t.includes('pack amor')) return { key: 'pack_amor_total', ...pc.pack_amor_total };
  if (t.includes('pack éxito') || t.includes('pack exito')) return { key: 'pack_exito', ...pc.pack_exito };
  if (t.includes('pack transformacion') || t.includes('pack transformación')) return { key: 'pack_transformacion', ...pc.pack_transformacion };
  if (t.includes('pack completo')) return { key: 'pack_completo', ...pc.pack_completo };
  if (t.includes('pack inicio') || t.includes('5 preguntas')) return { key: 'pack_inicio', ...pp.pack_inicio };
  if (t.includes('pack media') || t.includes('10 preguntas')) return { key: 'pack_media', ...pp.pack_media };
  return null;
}

function detectarMonto(texto) {
  const match = texto.match(/\$?\s?(\d[\d.,]+)/);
  if (!match) return null;
  const limpio = match[1].replace(/\./g, '').replace(',', '.');
  return parseFloat(limpio);
}

function validarPago(monto, precioEsperado) {
  const tolerancia = precios.tolerancia_pago || 100;
  return monto >= precioEsperado - tolerancia && monto <= precioEsperado + tolerancia;
}

function getHora() {
  return new Date().getHours();
}

// ─── Flujo principal ─────────────────────────────────────────────────────────

async function manejarMensaje(numero, mensajeTexto, tieneImagen) {
  const session = await getSession(numero);
  session.ultimaActividad = Date.now();

  // Agregar mensaje del usuario al historial
  session.historialChat.push({ role: 'user', content: mensajeTexto });

  let respuesta = '';

  switch (session.etapa) {

    // ── Bienvenida ─────────────────────────────────────────────────────────
    case 'bienvenida': {
      const prompt = getSofiaPrompt(getHora(), !session.esClienteNuevo, session.nombre);
      respuesta = await chat(prompt, [], mensajeTexto);
      session.etapa = 'esperando_eleccion';
      break;
    }

    // ── Esperando que elija servicio ───────────────────────────────────────
    case 'esperando_eleccion': {
      const servicioDetectado = detectarServicio(mensajeTexto);

      if (servicioDetectado) {
        session.servicio = servicioDetectado.key;
        session.precioServicio = servicioDetectado.precio;

        const alias = process.env.ALIAS;
        const cbu = process.env.CBU;

        // Solo mostrar datos de pago si están configurados
        if (alias && cbu) {
          respuesta = `perfecto! 🌙 ${servicioDetectado.nombre} son $${servicioDetectado.precio.toLocaleString('es-AR')}.\n\npodés transferir a:\n*Alias:* ${alias}\n*CBU:* ${cbu}\n*Monto exacto:* $${servicioDetectado.precio.toLocaleString('es-AR')}\n\ncuando hagas la transferencia mandame el comprobante y te paso con luna ✨`;
        } else {
          respuesta = `perfecto! 🌙 ${servicioDetectado.nombre} son $${servicioDetectado.precio.toLocaleString('es-AR')}.\n\nen un momento te paso los datos para la transferencia.`;
        }
        session.etapa = 'esperando_comprobante';
      } else {
        // Sofía responde con ayuda para elegir
        const prompt = getSofiaPrompt(getHora(), !session.esClienteNuevo, session.nombre);
        const histSinUltimo = session.historialChat.slice(0, -1);
        respuesta = await chat(prompt, histSinUltimo, mensajeTexto);
      }
      break;
    }

    // ── Esperando comprobante de pago ──────────────────────────────────────
    case 'esperando_comprobante': {
      if (tieneImagen) {
        session.esClienteNuevo = false;

        // Avisar al cliente que estamos verificando
        await enviarMensaje(numero, `recibí el comprobante ✨`);
        await new Promise(r => setTimeout(r, 800));
        await enviarMensaje(numero, `dame un segundo que lo verifico...`);

        // Obtener la URL del comprobante desde Twilio
        const mediaUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages/${req?.body?.MessageSid}/Media/${req?.body?.MediaSid0 || '0'}`;
        const urlDirecta = req?.body?.MediaUrl0;

        // Validar con Claude
        const validacion = urlDirecta
          ? await validarComprobante(urlDirecta, session.precioServicio)
          : { valido: false, motivo: 'no se pudo obtener el archivo' };

        if (validacion.valido) {
          // Pago aprobado automáticamente
          session.etapa = 'esperando_luna';
          session.montosPagados.push(session.precioServicio);
          await saveSession(numero, session);

          await new Promise(r => setTimeout(r, 500));
          await enviarMensaje(numero, `todo bien! pago verificado 🌙`);
          await new Promise(r => setTimeout(r, 800));
          await enviarMensaje(numero, `ya le aviso a luna. está terminando con una consulta y en 3 minutitos te escribe ella directamente ✨`);

          // Luna escribe en 3 minutos
          setTimeout(async () => {
            try {
              const s = await getSession(numero);
              if (s.etapa === 'esperando_luna') {
                s.etapa = 'con_luna';
                await saveSession(numero, s);
                const prompt = getLunaPrompt([], s.nombre, s.servicio, s.historialConsulta);
                const bienvenidaLuna = await chat(prompt, [], `El cliente acaba de pagar por "${s.servicio}". Presentate como Luna de forma cálida y preguntale sobre qué quiere consultar. Sé breve — máximo 2 líneas.`);
                await enviarMensaje(numero, bienvenidaLuna);
              }
            } catch (e) {
              console.error('Error al iniciar Luna:', e);
            }
          }, 3 * 60 * 1000);

          respuesta = ''; // Ya enviamos los mensajes manualmente
        } else {
          // Pago rechazado — notificar al admin para revisión manual
          const adminNum = process.env.ADMIN_WHATSAPP || '+5491132851143';
          try {
            await enviarMensaje(
              `whatsapp:${adminNum}`,
              `⚠️ *Comprobante no validado automáticamente*\n\nCliente: ${numero}\nServicio: ${session.servicio}\nMonto esperado: $${session.precioServicio?.toLocaleString('es-AR')}\nMotivo: ${validacion.motivo}\n\nEl comprobante fue enviado por el cliente. Revisalo y respondé:\n✅ *APROBAR ${numero}*\n❌ *RECHAZAR ${numero}*`
            );
          } catch (e) {
            console.error('Error notificando admin:', e);
          }

          session.etapa = 'verificando_pago';
          await new Promise(r => setTimeout(r, 500));
          await enviarMensaje(numero, `hmm, no pude verificar algunos datos del comprobante 🙏`);
          await new Promise(r => setTimeout(r, 800));
          respuesta = `asegurate de mandar el PDF desde "compartir comprobante" en tu app del banco, con el alias *${CUENTA.alias}* y el monto exacto de $${session.precioServicio?.toLocaleString('es-AR')}`;
        }
      } else {
        respuesta = `para verificar el pago necesito que me mandes el PDF del comprobante — desde tu app bancaria usá la opción "compartir comprobante" 📄`;
      }
      break;
    }

    // ── Verificando pago (revisión manual por admin) ───────────────────────
    case 'verificando_pago': {
      const esAdmin = numero === `whatsapp:${process.env.ADMIN_WHATSAPP || '+5491132851143'}`;
      if (esAdmin) {
        if (mensajeTexto.toUpperCase().startsWith('APROBAR')) {
          const clienteNumero = mensajeTexto.split(' ')[1];
          const sessionCliente = await getSession(clienteNumero);
          sessionCliente.etapa = 'esperando_luna';
          sessionCliente.montosPagados.push(sessionCliente.precioServicio);
          await saveSession(clienteNumero, sessionCliente);
          await enviarMensaje(clienteNumero, `pago confirmado ✨ ya le aviso a luna, en 3 minutos te escribe 🌙`);

          setTimeout(async () => {
            try {
              const s = await getSession(clienteNumero);
              if (s.etapa === 'esperando_luna') {
                s.etapa = 'con_luna';
                await saveSession(clienteNumero, s);
                const prompt = getLunaPrompt([], s.nombre, s.servicio, s.historialConsulta);
                const bienvenidaLuna = await chat(prompt, [], `El cliente acaba de pagar por "${s.servicio}". Presentate como Luna de forma cálida y preguntale sobre qué quiere consultar. Máximo 2 líneas.`);
                await enviarMensaje(clienteNumero, bienvenidaLuna);
              }
            } catch (e) { console.error('Error iniciando Luna tras aprobación manual:', e); }
          }, 3 * 60 * 1000);

          respuesta = `✅ aprobado. Luna escribe en 3 minutos a ${clienteNumero}`;
        } else if (mensajeTexto.toUpperCase().startsWith('RECHAZAR')) {
          const clienteNumero = mensajeTexto.split(' ')[1];
          const sessionCliente = await getSession(clienteNumero);
          sessionCliente.etapa = 'esperando_comprobante';
          await saveSession(clienteNumero, sessionCliente);
          await enviarMensaje(clienteNumero, `mirá, no pudimos verificar tu pago 🙏 ¿podés mandarnos el PDF del comprobante con el alias *${CUENTA.alias}* y el monto exacto de $${sessionCliente.precioServicio?.toLocaleString('es-AR')}?`);
          respuesta = `❌ rechazado. se pidió nuevo comprobante a ${clienteNumero}`;
        } else {
          respuesta = `comandos disponibles:\nAPROBAR whatsapp:+549...\nRECHAZAR whatsapp:+549...`;
        }
      } else {
        respuesta = `ya estamos verificando tu pago, en unos minutos te confirmamos 🌙`;
      }
      break;
    }

    // ── Esperando que Luna entre (3 minutos post-pago) ────────────────────
    case 'esperando_luna': {
      respuesta = `luna está por escribirte, un momentito más 🌙`;
      break;
    }

    // ── Luna atiende ───────────────────────────────────────────────────────
    case 'con_luna': {
      // Detectar tema para selección de cartas
      if (!session.historialConsulta) {
        session.historialConsulta = mensajeTexto;
      }

      const tema = detectarTema(mensajeTexto);
      const necesitaCartas = session.servicio?.includes('tirada') && session.cartasLanzadas.length === 0;

      if (necesitaCartas) {
        const cantidadCartas = session.servicio === 'tirada_completa' ? 7 : 3;
        session.cartasLanzadas = tirarCartas(cantidadCartas, tema);

        // Enviar mensaje de "concentrándome"
        await enviarMensaje(numero, `dame un ratito que me concentro... 📓`);

        // Simular delay y enviar cartas con imágenes
        await new Promise(r => setTimeout(r, 3000));

        for (let i = 0; i < session.cartasLanzadas.length; i++) {
          const carta = session.cartasLanzadas[i];
          const imgUrl = urlCarta(carta);
          await enviarImagen(numero, imgUrl, nombreCarta(carta));
          if (i < session.cartasLanzadas.length - 1) {
            await new Promise(r => setTimeout(r, 2000));
          }
        }

        // Ahora Luna interpreta
        const nombresCartas = session.cartasLanzadas.map(nombreCarta);
        const prompt = getLunaPrompt(nombresCartas, session.nombre, session.servicio, session.historialConsulta);
        const histSinUltimo = session.historialChat.slice(0, -1);
        respuesta = await chat(prompt, histSinUltimo, `El cliente pregunta: "${mensajeTexto}". Las cartas que salieron son: ${nombresCartas.join(', ')}. Hacé la lectura completa.`);
        session.etapa = 'upsell';
      } else {
        // Conversación con Luna sin tirada nueva
        const prompt = getLunaPrompt(
          session.cartasLanzadas.map(nombreCarta),
          session.nombre,
          session.servicio,
          session.historialConsulta
        );
        const histSinUltimo = session.historialChat.slice(0, -1);
        respuesta = await chat(prompt, histSinUltimo, mensajeTexto);
      }
      break;
    }

    // ── Post-consulta: upsell ──────────────────────────────────────────────
    case 'upsell': {
      const prompt = getLunaPrompt(
        session.cartasLanzadas.map(nombreCarta),
        session.nombre,
        session.servicio,
        session.historialConsulta
      );
      const histSinUltimo = session.historialChat.slice(0, -1);
      respuesta = await chat(prompt, histSinUltimo, mensajeTexto);
      break;
    }

    default: {
      // Fallback: reiniciar con Sofía
      session.etapa = 'bienvenida';
      const prompt = getSofiaPrompt(getHora(), false, null);
      respuesta = await chat(prompt, [], mensajeTexto);
    }
  }

  // Guardar respuesta en historial
  if (respuesta) {
    session.historialChat.push({ role: 'assistant', content: respuesta });
  }

  // Mantener historial acotado
  if (session.historialChat.length > 40) {
    session.historialChat = session.historialChat.slice(-40);
  }

  await saveSession(numero, session);
  return respuesta;
}

// ─── Handler de Vercel ───────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    // Health check
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

    if (!numero) {
      return res.status(400).send('');
    }

    // Procesar mensaje ANTES de responder a Twilio
    const respuesta = await manejarMensaje(numero, mensajeTexto, tieneImagen);

    // Responder con TwiML para que Twilio entregue el mensaje
    const twiml = new twilio.twiml.MessagingResponse();
    if (respuesta) {
      twiml.message(respuesta);
    }
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(twiml.toString());

  } catch (error) {
    console.error('Error en webhook WhatsApp:', error);
    // Responder igual para que Twilio no reintente
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('un segundo amor, estoy concentrándome 🌙 escribime de nuevo');
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(twiml.toString());
  }
};
