const { getSession, saveSession } = require('../lib/session-store');
const { getLunaPrompt } = require('../config/prompts');
const { chat } = require('../lib/anthropic');

const WHAPI_URL = 'https://gate.whapi.cloud';

function formatNumero(numero) {
  if (!numero) return '';
  if (numero.includes('@')) return numero;
  return `${numero.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
}

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
  const partes = respuesta.split('|||').map(p => p.trim()).filter(p => p.length > 0);
  for (let i = 0; i < partes.length; i++) {
    await enviarMensaje(numero, partes[i]);
    if (i < partes.length - 1) await new Promise(r => setTimeout(r, 1200));
  }
}

module.exports = async function handler(req, res) {
  // Vercel Cron autentica con Authorization: Bearer $CRON_SECRET
  // Si no hay CRON_SECRET configurado, dejamos pasar (solo desde Vercel)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers['authorization'];
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const { getPendingLunaSessions } = require('../lib/session-store');

  try {
    const pendientes = await getPendingLunaSessions();
    let procesados = 0;

    for (const numero of pendientes) {
      try {
        const session = await getSession(numero);
        if (session.etapa !== 'esperando_luna') continue;
        if (!session.lunaDebeEscribirEn || Date.now() < session.lunaDebeEscribirEn) continue;

        // Iniciar Luna — NO guardar sesión antes de chat() para evitar estado corrupto si hay timeout
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

        const mensajeLuna = await chat(
          prompt, [],
          `Presentate como Luna en una frase cálida y directa. Corroborá los datos del cliente de forma natural: "${datosTexto}". ${contextoTexto ? `Sabés que ${contextoTexto}.` : ''} Preguntá si quiere agregar algo antes de arrancar. Sin emojis. Usá ||| para separar mensajes.`
        );

        // Solo marcar como iniciado si chat() tuvo éxito
        session.etapa = 'con_luna';
        session.lunaRecopiloData = true;
        session.historialChat.push({ role: 'assistant', content: mensajeLuna });
        await saveSession(numero, session);
        await enviarMensajesMultiples(numero, mensajeLuna);
        procesados++;
      } catch (err) {
        console.error('Error procesando sesión', numero, err.message);
      }
    }

    res.status(200).json({ ok: true, procesados });
  } catch (err) {
    console.error('Error en cron:', err);
    res.status(500).json({ error: err.message });
  }
};
