const { getSession, saveSession } = require('../lib/session-store');
const { getLunaPrompt } = require('../config/prompts');
const { chat } = require('../lib/anthropic');
const twilio = require('twilio');

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

function whatsappFrom() {
  const num = process.env.TWILIO_WHATSAPP_NUMBER || '';
  return num.startsWith('whatsapp:') ? num : `whatsapp:${num}`;
}

async function enviarMensajesMultiples(numero, respuesta) {
  const partes = respuesta.split('|||').map(p => p.trim()).filter(p => p.length > 0);
  for (let i = 0; i < partes.length; i++) {
    await twilioClient.messages.create({ from: whatsappFrom(), to: numero, body: partes[i] });
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
      const session = await getSession(numero);
      if (session.etapa !== 'esperando_luna') continue;
      if (!session.lunaDebeEscribirEn || Date.now() < session.lunaDebeEscribirEn) continue;

      // Iniciar Luna
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
        prompt, [],
        `La clienta acaba de pagar por "${session.servicio}". ${session.contextoPorCliente ? `Quiere que sepas: "${session.contextoPorCliente}".` : ''} Presentate como Luna de forma cálida y natural, y preguntale sobre qué quiere consultar. Usá ||| para separar mensajes.`
      );

      await enviarMensajesMultiples(numero, mensajeLuna);
      procesados++;
    }

    res.status(200).json({ ok: true, procesados });
  } catch (err) {
    console.error('Error en cron:', err);
    res.status(500).json({ error: err.message });
  }
};
