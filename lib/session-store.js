const memorySessions = new Map();
const mensajesProcesados = new Map(); // fallback sin Redis: msgId → timestamp
const locksMemoria = new Map();       // fallback sin Redis: numero → timestamp

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
    bufferFragmentos: [],
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

async function getPreguntasRestantes(numero) {
  const redis = getRedis();
  if (redis) {
    try {
      const val = await redis.get(`preguntas:${numero}`);
      return val !== null ? parseInt(val, 10) : null;
    } catch (err) {
      console.error('Redis getPreguntasRestantes error:', err.message);
      return null;
    }
  }
  return null;
}

async function setPreguntasRestantes(numero, cantidad) {
  const redis = getRedis();
  const TTL_PREGUNTAS = 60 * 60 * 24 * 30; // 30 días
  if (redis) {
    try {
      await redis.set(`preguntas:${numero}`, cantidad, 'EX', TTL_PREGUNTAS);
    } catch (err) {
      console.error('Redis setPreguntasRestantes error:', err.message);
    }
  }
}

async function decrementarPregunta(numero) {
  const redis = getRedis();
  if (redis) {
    try {
      const nuevo = await redis.decr(`preguntas:${numero}`);
      return nuevo;
    } catch (err) {
      console.error('Redis decrementarPregunta error:', err.message);
      return null;
    }
  }
  return null;
}

// ── Idempotencia: marcar un mensaje como procesado (anti-reintentos de Whapi) ──
// Devuelve true si es la PRIMERA vez que se ve este msgId, false si ya fue procesado.
async function marcarMensajeProcesado(msgId, ttlSegundos = 300) {
  if (!msgId) return true; // sin id no podemos deduplicar; dejar pasar
  const redis = getRedis();
  if (redis) {
    try {
      const res = await redis.set(`procesado:${msgId}`, '1', 'EX', ttlSegundos, 'NX');
      return res === 'OK'; // 'OK' = se seteó (nuevo); null = ya existía
    } catch (err) {
      console.error('Redis marcarMensajeProcesado error, usando memoria:', err.message);
    }
  }
  // Fallback en memoria con limpieza perezosa
  const ahora = Date.now();
  const visto = mensajesProcesados.get(msgId);
  if (visto && (ahora - visto) < ttlSegundos * 1000) return false;
  mensajesProcesados.set(msgId, ahora);
  if (mensajesProcesados.size > 1000) {
    for (const [k, t] of mensajesProcesados) {
      if (ahora - t > ttlSegundos * 1000) mensajesProcesados.delete(k);
    }
  }
  return true;
}

// ── Lock por número: evita que dos webhooks en paralelo pisen la misma sesión ──
async function adquirirLock(numero, ttlSegundos = 30) {
  const redis = getRedis();
  if (redis) {
    try {
      const res = await redis.set(`lock:${numero}`, '1', 'EX', ttlSegundos, 'NX');
      return res === 'OK';
    } catch (err) {
      console.error('Redis adquirirLock error, usando memoria:', err.message);
    }
  }
  const ahora = Date.now();
  const lock = locksMemoria.get(numero);
  if (lock && (ahora - lock) < ttlSegundos * 1000) return false;
  locksMemoria.set(numero, ahora);
  return true;
}

async function liberarLock(numero) {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(`lock:${numero}`);
    } catch (err) {
      console.error('Redis liberarLock error:', err.message);
    }
  }
  locksMemoria.delete(numero);
}

module.exports = { getSession, saveSession, deleteSession, getPendingLunaSessions, getPreguntasRestantes, setPreguntasRestantes, decrementarPregunta, marcarMensajeProcesado, adquirirLock, liberarLock };
