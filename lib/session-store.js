const memorySessions = new Map();

let redisClient = null;

function getRedis() {
  if (redisClient) return redisClient;
  if (process.env.REDIS_URL) {
    const Redis = require('ioredis');
    redisClient = new Redis(process.env.REDIS_URL, { lazyConnect: true });
    return redisClient;
  }
  return null;
}

const TTL_SEGUNDOS = 60 * 60 * 24;

async function getSession(numero) {
  const redis = getRedis();
  if (redis) {
    const data = await redis.get(`session:${numero}`);
    return data ? JSON.parse(data) : sesionInicial();
  }
  return memorySessions.get(numero) || sesionInicial();
}

async function saveSession(numero, session) {
  const redis = getRedis();
  if (redis) {
    await redis.set(`session:${numero}`, JSON.stringify(session), 'EX', TTL_SEGUNDOS);
  } else {
    memorySessions.set(numero, session);
  }
}

async function deleteSession(numero) {
  const redis = getRedis();
  if (redis) {
    await redis.del(`session:${numero}`);
  } else {
    memorySessions.delete(numero);
  }
}

function sesionInicial() {
  return {
    etapa: 'bienvenida',
    nombre: null,
    servicio: null,
    precioServicio: null,
    montosPagados: [],
    cartasLanzadas: [],
    preguntasRestantes: 0,
    historialChat: [],
    historialConsulta: '',
    upsellsVistos: [],
    esClienteNuevo: true,
    ultimaActividad: Date.now()
  };
}

module.exports = { getSession, saveSession, deleteSession };
