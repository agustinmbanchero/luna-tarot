const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_TOKENS = 4096;
const MODEL = 'claude-sonnet-4-6';

// Limita el historial a los últimos N turnos para no exceder contexto
function trimHistorial(historial, maxTurnos = 20) {
  if (historial.length <= maxTurnos * 2) return historial;
  return historial.slice(-(maxTurnos * 2));
}

async function chat(systemPrompt, historial, mensajeUsuario, maxTokens = MAX_TOKENS) {
  const mensajes = [
    ...trimHistorial(historial),
    { role: 'user', content: mensajeUsuario }
  ];

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: mensajes
  });

  return response.content[0].text;
}

module.exports = { chat };
