// Sesiones en memoria para desarrollo local.
// En producción Vercel usa @vercel/kv (Redis).
const memorySessions = new Map();

function getKV() {
  try {
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      return require('@vercel/kv').kv;
    }
  } catch (_) {}
  return null;
}

const TTL_SEGUNDOS = 60 * 60 * 24; // 24 horas

async function getSession(numero) {
  const kv = getKV();
  if (kv) {
    const data = await kv.get(`session:${numero}`);
    return data || sesionInicial();
  }
  return memorySessions.get(numero) || sesionInicial();
}

async function saveSession(numero, session) {
  const kv = getKV();
  if (kv) {
    await kv.set(`session:${numero}`, session, { ex: TTL_SEGUNDOS });
  } else {
    memorySessions.set(numero, session);
  }
}

async function deleteSession(numero) {
  const kv = getKV();
  if (kv) {
    await kv.del(`session:${numero}`);
  } else {
    memorySessions.delete(numero);
  }
}

function sesionInicial() {
  return {
    // Etapa del flujo: bienvenida | esperando_eleccion | esperando_pago | esperando_comprobante | con_luna | upsell | finalizada
    etapa: 'bienvenida',
    nombre: null,
    servicio: null,
    precioServicio: null,
    montosPagados: [],
    cartasLanzadas: [],
    preguntasRestantes: 0,
    historialChat: [],        // [{role, content}] para Claude
    historialConsulta: '',    // resumen del tema para el prompt de Luna
    upsellsVistos: [],
    esClienteNuevo: true,
    ultimaActividad: Date.now()
  };
}

module.exports = { getSession, saveSession, deleteSession };
