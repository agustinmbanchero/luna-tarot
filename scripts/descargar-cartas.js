const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DESTINO = path.join(__dirname, '..', 'public', 'cartas');

const CARTAS = {
  el_loco:           'RWS_Tarot_00_Fool.jpg',
  el_mago:           'RWS Tarot 01 Magician.jpg',
  la_sacerdotisa:    'RWS_Tarot_02_High_Priestess.jpg',
  la_emperatriz:     'RWS_Tarot_03_Empress.jpg',
  el_emperador:      'RWS_Tarot_04_Emperor.jpg',
  el_hierofante:     'RWS Tarot 05 Hierophant.jpg',
  los_enamorados:    'RWS_Tarot_06_Lovers.jpg',
  el_carro:          'RWS_Tarot_07_Chariot.jpg',
  la_fuerza:         'RWS_Tarot_08_Strength.jpg',
  el_ermitano:       'RWS_Tarot_09_Hermit.jpg',
  la_rueda_fortuna:  'RWS_Tarot_10_Wheel_of_Fortune.jpg',
  la_justicia:       'RWS_Tarot_11_Justice.jpg',
  el_colgado:        'RWS Tarot 12 Hanged Man.jpg',
  la_muerte:         'RWS_Tarot_13_Death.jpg',
  la_templanza:      'RWS_Tarot_14_Temperance.jpg',
  el_diablo:         'RWS Tarot 15 Devil.jpg',
  la_torre:          'RWS_Tarot_16_Tower.jpg',
  la_estrella:       'RWS_Tarot_17_Star.jpg',
  la_luna:           'RWS Tarot 18 Moon.jpg',
  el_sol:            'RWS_Tarot_19_Sun.jpg',
  el_juicio:         'RWS_Tarot_20_Judgement.jpg',
  el_mundo:          'RWS Tarot 21 World.jpg',
  as_bastos:         'Wands01.jpg',
  '2_bastos':        'Wands02.jpg',
  '3_bastos':        'Wands03.jpg',
  '4_bastos':        'Wands04.jpg',
  '5_bastos':        'Wands05.jpg',
  '6_bastos':        'Wands06.jpg',
  '7_bastos':        'Wands07.jpg',
  '8_bastos':        'Wands08.jpg',
  '9_bastos':        'Wands09.jpg',
  '10_bastos':       'Wands10.jpg',
  paje_bastos:       'Wands11.jpg',
  caballero_bastos:  'Wands12.jpg',
  reina_bastos:      'Wands13.jpg',
  rey_bastos:        'Wands14.jpg',
  as_copas:          'Cups01.jpg',
  '2_copas':         'Cups02.jpg',
  '3_copas':         'Cups03.jpg',
  '4_copas':         'Cups04.jpg',
  '5_copas':         'Cups05.jpg',
  '6_copas':         'Cups06.jpg',
  '7_copas':         'Cups07.jpg',
  '8_copas':         'Cups08.jpg',
  '9_copas':         'Cups09.jpg',
  '10_copas':        'Cups10.jpg',
  paje_copas:        'Cups11.jpg',
  caballero_copas:   'Cups12.jpg',
  reina_copas:       'Cups13.jpg',
  rey_copas:         'Cups14.jpg',
  as_espadas:        'Swords01.jpg',
  '2_espadas':       'Swords02.jpg',
  '3_espadas':       'Swords03.jpg',
  '4_espadas':       'Swords04.jpg',
  '5_espadas':       'Swords05.jpg',
  '6_espadas':       'Swords06.jpg',
  '7_espadas':       'Swords07.jpg',
  '8_espadas':       'Swords08.jpg',
  '9_espadas':       'Swords09.jpg',
  '10_espadas':      'Swords10.jpg',
  paje_espadas:      'Swords11.jpg',
  caballero_espadas: 'Swords12.jpg',
  reina_espadas:     'Swords13.jpg',
  rey_espadas:       'Swords14.jpg',
  as_pentaculos:          'Pents01.jpg',
  '2_pentaculos':         'Pents02.jpg',
  '3_pentaculos':         'Pents03.jpg',
  '4_pentaculos':         'Pents04.jpg',
  '5_pentaculos':         'Pents05.jpg',
  '6_pentaculos':         'Pents06.jpg',
  '7_pentaculos':         'Pents07.jpg',
  '8_pentaculos':         'Pents08.jpg',
  '9_pentaculos':         'Pents09.jpg',
  '10_pentaculos':        'Pents10.jpg',
  paje_pentaculos:        'Pents11.jpg',
  caballero_pentaculos:   'Pents12.jpg',
  reina_pentaculos:       'Pents13.jpg',
  rey_pentaculos:         'Pents14.jpg',
};

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'luna-tarot-bot/1.0' } }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function descargarArchivo(url, destino, reintentos = 4) {
  // Limpiar UTM params que Wikimedia agrega
  const urlLimpia = url.split('?')[0];
  return new Promise(async (resolve, reject) => {
    for (let i = 0; i < reintentos; i++) {
      try {
        await intentarDescarga(urlLimpia, destino);
        return resolve();
      } catch (err) {
        if (i < reintentos - 1) {
          const espera = 8000 * (i + 1);
          await sleep(espera);
        } else {
          reject(err);
        }
      }
    }
  });
}

function intentarDescarga(url, destino) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const req = proto.get(url, { headers: { 'User-Agent': 'luna-tarot-bot/1.0' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        res.resume();
        return intentarDescarga(res.headers.location, destino).then(resolve).catch(reject);
      }
      if (res.statusCode === 429) {
        res.resume();
        return reject(new Error('HTTP 429'));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const file = fs.createWriteStream(destino);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', err => { fs.unlink(destino, () => {}); reject(err); });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// Obtener URLs reales via API de Wikimedia en lotes de 40
async function obtenerUrlsEnLote(archivos) {
  const titulos = archivos.map(f => `File:${f}`).join('|');
  const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(titulos)}&prop=imageinfo&iiprop=url&format=json`;
  const data = await fetchJson(url);
  const urls = {};
  for (const page of Object.values(data.query.pages)) {
    if (page.imageinfo && page.imageinfo[0]) {
      const nombre = page.title.replace('File:', '');
      // Usar la ruta de thumbnail en vez del archivo original (no rate-limited)
      urls[nombre] = `https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/${encodeURIComponent(nombre)}&width=800`;
    }
  }
  return urls;
}

async function main() {
  if (!fs.existsSync(DESTINO)) fs.mkdirSync(DESTINO, { recursive: true });

  const entradas = Object.entries(CARTAS);
  const pendientes = entradas.filter(([id]) => {
    const dest = path.join(DESTINO, `${id}.jpg`);
    return !fs.existsSync(dest) || fs.statSync(dest).size < 1000;
  });

  if (pendientes.length === 0) {
    console.log('Todas las cartas ya están descargadas.');
    return;
  }

  console.log(`Obteniendo URLs de ${pendientes.length} cartas via API...`);

  // Agrupar por archivo Commons (puede haber duplicados de nombre)
  const archivosUnicos = [...new Set(pendientes.map(([, archivo]) => archivo))];

  // Obtener URLs en lotes de 40
  const urlsMap = {};
  for (let i = 0; i < archivosUnicos.length; i += 40) {
    const lote = archivosUnicos.slice(i, i + 40);
    const urls = await obtenerUrlsEnLote(lote);
    Object.assign(urlsMap, urls);
    if (i + 40 < archivosUnicos.length) await sleep(1000);
  }

  console.log(`URLs obtenidas: ${Object.keys(urlsMap).length}/${archivosUnicos.length}\n`);

  let ok = entradas.length - pendientes.length;
  const errores = [];

  for (const [id, archivo] of pendientes) {
    const destino = path.join(DESTINO, `${id}.jpg`);
    const url = urlsMap[archivo];

    if (!url) {
      console.log(`  MISSING  ${id} (${archivo} no encontrado en Commons)`);
      errores.push(id);
      continue;
    }

    try {
      await descargarArchivo(url, destino);
      const size = Math.round(fs.statSync(destino).size / 1024);
      console.log(`  ok    ${id} (${size}KB)`);
      ok++;
    } catch (err) {
      console.log(`  ERROR ${id}: ${err.message}`);
      errores.push(id);
      if (fs.existsSync(destino)) fs.unlinkSync(destino);
    }

    await sleep(3000);
  }

  console.log(`\n✓ ${ok}/${entradas.length} descargadas`);
  if (errores.length) console.log(`✗ Errores: ${errores.join(', ')}`);
}

main().catch(console.error);
