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
    try {
      const data = await redis.get(`session:${numero}`);
      return data ? JSON.parse(data) : sesionInicial();
    } catch (err) {
      console.error('Redis getSession error, usando memoria:', err.message);
      return memorySessions.get(numero) || sesionInicial();
    }
  }
  return memorySessions.get(numero) || sesionInicial();
}

async function saveSession(numero, session) {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(`session:${numero}`, JSON.stringify(session), 'EX', TTL_SEGUNDOS);
    } catch (err) {
      console.error('Redis saveSession error, guardando en memoria:', err.message);
      memorySessions.set(numero, session);
    }
  } else {
    memorySessions.set(numero, session);
  }
}

async function deleteSession(numero) {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(`session:${numero}`);
    } catch (err) {
      console.error('Redis deleteSession error:', err.message);
    }
  }
  memorySessions.delete(numero);
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

async function getPendingLunaSessions() {
  const redis = getRedis();
  if (redis) {
    try {
      const keys = await redis.keys('session:*');
      return keys.map(k => k.replace('session:', ''));
    } catch (err) {
      console.error('Redis getPendingLunaSessions error:', err.message);
      return [...memorySessions.keys()];
    }
  }
  return [...memorySessions.keys()];
}

module.exports = { getSession, saveSession, deleteSession, getPendingLunaSessions };
