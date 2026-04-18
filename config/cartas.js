const TODAS_LAS_CARTAS = [
  // Arcanos Mayores
  "el_loco", "el_mago", "la_sacerdotisa", "la_emperatriz", "el_emperador",
  "el_hierofante", "los_enamorados", "el_carro", "la_fuerza", "el_ermitano",
  "la_rueda_fortuna", "la_justicia", "el_colgado", "la_muerte", "la_templanza",
  "el_diablo", "la_torre", "la_estrella", "la_luna", "el_sol",
  "el_juicio", "el_mundo",
  // Bastos
  "as_bastos", "2_bastos", "3_bastos", "4_bastos", "5_bastos",
  "6_bastos", "7_bastos", "8_bastos", "9_bastos", "10_bastos",
  "paje_bastos", "caballero_bastos", "reina_bastos", "rey_bastos",
  // Copas
  "as_copas", "2_copas", "3_copas", "4_copas", "5_copas",
  "6_copas", "7_copas", "8_copas", "9_copas", "10_copas",
  "paje_copas", "caballero_copas", "reina_copas", "rey_copas",
  // Espadas
  "as_espadas", "2_espadas", "3_espadas", "4_espadas", "5_espadas",
  "6_espadas", "7_espadas", "8_espadas", "9_espadas", "10_espadas",
  "paje_espadas", "caballero_espadas", "reina_espadas", "rey_espadas",
  // Pentáculos
  "as_pentaculos", "2_pentaculos", "3_pentaculos", "4_pentaculos", "5_pentaculos",
  "6_pentaculos", "7_pentaculos", "8_pentaculos", "9_pentaculos", "10_pentaculos",
  "paje_pentaculos", "caballero_pentaculos", "reina_pentaculos", "rey_pentaculos"
];

// Cartas con mayor peso según el tema de la consulta
const CARTAS_POR_TEMA = {
  amor: [
    "los_enamorados", "la_emperatriz", "la_luna", "2_copas", "as_copas",
    "10_copas", "reina_copas", "6_copas", "la_estrella", "3_copas"
  ],
  trabajo: [
    "el_mago", "la_rueda_fortuna", "el_sol", "as_pentaculos", "5_pentaculos",
    "8_pentaculos", "el_mundo", "el_carro", "rey_pentaculos", "3_pentaculos"
  ],
  dinero: [
    "as_pentaculos", "el_mago", "la_rueda_fortuna", "9_pentaculos", "10_pentaculos",
    "5_pentaculos", "el_mundo", "el_sol", "rey_pentaculos", "4_pentaculos"
  ],
  bloqueos: [
    "la_torre", "el_colgado", "el_ermitano", "8_espadas", "el_diablo",
    "la_luna", "5_espadas", "9_espadas", "4_espadas", "la_muerte"
  ],
  decisiones: [
    "la_justicia", "el_carro", "el_loco", "2_espadas", "el_hierofante",
    "los_enamorados", "la_templanza", "el_ermitano", "7_copas", "el_juicio"
  ],
  futuro: [
    "el_mundo", "la_estrella", "el_juicio", "10_copas", "el_sol",
    "la_rueda_fortuna", "el_carro", "as_bastos", "as_copas", "as_pentaculos"
  ],
  general: TODAS_LAS_CARTAS
};

// Cartas que siempre deben aparecer al final si la lectura fue difícil
const CARTAS_POSITIVAS = [
  "el_sol", "la_estrella", "el_mundo", "10_copas", "as_copas",
  "as_bastos", "9_copas", "la_rueda_fortuna", "el_juicio", "la_emperatriz"
];

// Cartas consideradas difíciles — necesitan al menos 1 positiva después
const CARTAS_DIFICILES = [
  "la_torre", "la_muerte", "10_espadas", "3_espadas", "el_diablo",
  "9_espadas", "5_espadas", "8_espadas", "el_colgado"
];

function detectarTema(mensaje) {
  const m = mensaje.toLowerCase();
  if (m.match(/amor|pareja|novio|novia|ex|relacion|vínculo|vinculo|corazón|corazon|enamorado|separacion|ruptura/)) return "amor";
  if (m.match(/trabajo|empleo|jefe|empresa|negocio|proyecto|carrera|laboral|profesional/)) return "trabajo";
  if (m.match(/dinero|plata|deuda|economia|económico|economico|finanzas|inversion|inversión|abundancia/)) return "dinero";
  if (m.match(/bloqueo|frenada|estancada|atascada|traba|obstáculo|obstaculo|no puedo|no logro/)) return "bloqueos";
  if (m.match(/decido|decidir|decisión|decision|elijo|elegir|camino|opciones/)) return "decisiones";
  if (m.match(/futuro|mañana|próximo|proximo|qué va a pasar|que va a pasar/)) return "futuro";
  return "general";
}

function mezclar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function tirarCartas(cantidad, tema = "general") {
  const pool = CARTAS_POR_TEMA[tema] || TODAS_LAS_CARTAS;
  // 70% del pool temático, 30% del mazo completo
  const combinado = [...new Set([...mezclar(pool), ...mezclar(TODAS_LAS_CARTAS)])];
  let seleccion = combinado.slice(0, cantidad);

  // Si hay cartas difíciles, asegurar que termine con una positiva
  const tieneDificil = seleccion.some(c => CARTAS_DIFICILES.includes(c));
  if (tieneDificil) {
    const positiva = CARTAS_POSITIVAS.find(c => !seleccion.includes(c));
    if (positiva) seleccion[seleccion.length - 1] = positiva;
  }

  return seleccion;
}

function nombreCarta(id) {
  const nombres = {
    el_loco: "El Loco", el_mago: "El Mago", la_sacerdotisa: "La Sacerdotisa",
    la_emperatriz: "La Emperatriz", el_emperador: "El Emperador",
    el_hierofante: "El Hierofante", los_enamorados: "Los Enamorados",
    el_carro: "El Carro", la_fuerza: "La Fuerza", el_ermitano: "El Ermitaño",
    la_rueda_fortuna: "La Rueda de la Fortuna", la_justicia: "La Justicia",
    el_colgado: "El Colgado", la_muerte: "La Muerte", la_templanza: "La Templanza",
    el_diablo: "El Diablo", la_torre: "La Torre", la_estrella: "La Estrella",
    la_luna: "La Luna", el_sol: "El Sol", el_juicio: "El Juicio", el_mundo: "El Mundo",
    as_bastos: "As de Bastos", "2_bastos": "2 de Bastos", "3_bastos": "3 de Bastos",
    "4_bastos": "4 de Bastos", "5_bastos": "5 de Bastos", "6_bastos": "6 de Bastos",
    "7_bastos": "7 de Bastos", "8_bastos": "8 de Bastos", "9_bastos": "9 de Bastos",
    "10_bastos": "10 de Bastos", paje_bastos: "Paje de Bastos",
    caballero_bastos: "Caballero de Bastos", reina_bastos: "Reina de Bastos",
    rey_bastos: "Rey de Bastos",
    as_copas: "As de Copas", "2_copas": "2 de Copas", "3_copas": "3 de Copas",
    "4_copas": "4 de Copas", "5_copas": "5 de Copas", "6_copas": "6 de Copas",
    "7_copas": "7 de Copas", "8_copas": "8 de Copas", "9_copas": "9 de Copas",
    "10_copas": "10 de Copas", paje_copas: "Paje de Copas",
    caballero_copas: "Caballero de Copas", reina_copas: "Reina de Copas",
    rey_copas: "Rey de Copas",
    as_espadas: "As de Espadas", "2_espadas": "2 de Espadas", "3_espadas": "3 de Espadas",
    "4_espadas": "4 de Espadas", "5_espadas": "5 de Espadas", "6_espadas": "6 de Espadas",
    "7_espadas": "7 de Espadas", "8_espadas": "8 de Espadas", "9_espadas": "9 de Espadas",
    "10_espadas": "10 de Espadas", paje_espadas: "Paje de Espadas",
    caballero_espadas: "Caballero de Espadas", reina_espadas: "Reina de Espadas",
    rey_espadas: "Rey de Espadas",
    as_pentaculos: "As de Pentáculos", "2_pentaculos": "2 de Pentáculos",
    "3_pentaculos": "3 de Pentáculos", "4_pentaculos": "4 de Pentáculos",
    "5_pentaculos": "5 de Pentáculos", "6_pentaculos": "6 de Pentáculos",
    "7_pentaculos": "7 de Pentáculos", "8_pentaculos": "8 de Pentáculos",
    "9_pentaculos": "9 de Pentáculos", "10_pentaculos": "10 de Pentáculos",
    paje_pentaculos: "Paje de Pentáculos", caballero_pentaculos: "Caballero de Pentáculos",
    reina_pentaculos: "Reina de Pentáculos", rey_pentaculos: "Rey de Pentáculos"
  };
  return nombres[id] || id;
}

module.exports = { tirarCartas, nombreCarta, detectarTema, CARTAS_DIFICILES };
