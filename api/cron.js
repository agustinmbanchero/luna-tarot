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
      const session = await getSession(numero);
      if (session.etapa !== 'esperando_luna') continue;
      if (!session.lunaDebeEscribirEn || Date.now() < session.lunaDebeEscribirEn) continue;

      // Iniciar Luna
      session.etapa = 'con_luna';
      // Luna pedirá datos en su primer mensaje → cuando el cliente responda se hace la lectura
      session.lunaRecopiloData = true;
      await saveSession(numero, session);

      const esCartaAstral = (session.servicio || '').toLowerCase().includes('carta_astral')
        || (session.servicio || '').toLowerCase().includes('carta astral');
      const pedidoDatos = esCartaAstral
        ? 'fecha de nacimiento completa (día, mes y año), hora de nacimiento si la tenés, y ciudad donde naciste'
        : 'fecha de nacimiento (día, mes y año)';

      const prompt = getLunaPrompt({
        cartasIds: session.cartasLanzadas || [],
        nombreCliente: session.nombre,
        servicio: session.servicio,
        historialSofia: session.resumenSofia,
        contextoDadoPorCliente: session.contextoPorCliente
      });

      const contextoConocido = session.contextoPorCliente
        ? `El cliente quiere consultar sobre: "${session.contextoPorCliente}".`
        : session.resumenSofia
          ? `Contexto de la conversación con Sofía: ${session.resumenSofia}`
          : '';

      const mensajeLuna = await chat(
        prompt, [],
        `Presentate como Luna en una o dos frases cálidas y directas. Mencioná el servicio contratado (${session.servicio || 'consulta'}). ${contextoConocido} Luego pedíle su ${pedidoDatos} para personalizar la lectura. Sin emojis. Usá ||| para separar mensajes.`
      );

      session.historialChat.push({ role: 'assistant', content: mensajeLuna });
      await saveSession(numero, session);
      await enviarMensajesMultiples(numero, mensajeLuna);
      procesados++;
    }

    res.status(200).json({ ok: true, procesados });
  } catch (err) {
    console.error('Error en cron:', err);
    res.status(500).json({ error: err.message });
  }
};
