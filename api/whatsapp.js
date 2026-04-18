const twilio = require('twilio');
const { getSession, saveSession } = require('../lib/session-store');
const { chat } = require('../lib/anthropic');
const { getSofiaPrompt, getLunaPrompt } = require('../config/prompts');
const { tirarCartas, nombreCarta, detectarTema } = require('../config/cartas');
const precios = require('../config/precios.json');

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

async function enviarImagen(numero, urlImagen, caption = '') {
  await twilioClient.messages.create({
    from: process.env.TWILIO_WHATSAPP_NUMBER,
    to: numero,
    mediaUrl: [urlImagen],
    body: caption
  });
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

        const alias = process.env.ALIAS || '[alias]';
        const cbu = process.env.CBU || '[CBU]';

        respuesta = `perfecto! 🌙 ${servicioDetectado.nombre} son $${servicioDetectado.precio.toLocaleString('es-AR')}.\n\npodés transferir a:\n*Alias:* ${alias}\n*CBU:* ${cbu}\n*Monto exacto:* $${servicioDetectado.precio.toLocaleString('es-AR')}\n\ncuando hagas la transferencia mandame el comprobante y te paso con luna ✨`;
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
        // Validación por imagen — asumimos válido (agregar OCR si se quiere)
        session.montosPagados.push(session.precioServicio);
        session.etapa = 'con_luna';
        session.esClienteNuevo = false;

        respuesta = `recibí el comprobante, gracias! ✨ ya le aviso a luna.\n\nella está terminando con la consulta anterior — en unos minutos te escribe 🌙`;
      } else {
        // Intentar detectar monto en el texto
        const monto = detectarMonto(mensajeTexto);
        if (monto && validarPago(monto, session.precioServicio)) {
          session.montosPagados.push(monto);
          session.etapa = 'con_luna';
          session.esClienteNuevo = false;
          respuesta = `listo, todo confirmado! ✨ ya le aviso a luna.\n\nella está terminando con la consulta anterior — en unos minutitos te escribe 🌙`;
        } else if (monto) {
          respuesta = `hmm, el monto que veo no coincide con el servicio (debería ser $${session.precioServicio?.toLocaleString('es-AR')}). ¿podés verificar y mandarme el comprobante de nuevo?`;
        } else {
          respuesta = `cuando hagas la transferencia mandame el comprobante (foto o texto con el monto) y te confirmo en segundos ✨`;
        }
      }
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

    // Responder a Twilio inmediatamente (evita timeout)
    res.status(200).send('');

    // Procesar y responder de forma asíncrona
    const respuesta = await manejarMensaje(numero, mensajeTexto, tieneImagen);

    if (respuesta) {
      await enviarMensaje(numero, respuesta);
    }
  } catch (error) {
    console.error('Error en webhook WhatsApp:', error);
    res.status(200).send('');
  }
};
