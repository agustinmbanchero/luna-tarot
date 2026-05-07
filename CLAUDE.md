# CLAUDE.md — Bot WhatsApp: Estudio de Tarot Luna

## Descripción del proyecto

Bot de WhatsApp para el **Estudio de Tarot Luna** (cliente: Ezequiel Mosquera).
Simula dos personajes: **Sofía** (recepcionista) y **Luna** (tarotista), con flujo de cobro previo a la consulta.

## Stack

- **Runtime**: Node.js (serverless, Vercel)
- **WhatsApp API**: Whapi.cloud — webhook + envío de mensajes
- **IA**: Anthropic Claude (`claude-sonnet-4-6` para chat, `claude-haiku-4-5` para detección de servicios)
- **Sesiones**: Redis via ioredis (`REDIS_URL`). Fallback a Map en memoria si no hay Redis.
- **Deploy**: Vercel Hobby plan, auto-deploy desde rama `main`
- **Repo**: `agustinmbanchero/luna-tarot` en GitHub

## URLs

- Producción: `https://luna-tarot-liart.vercel.app`
- Webhook Whapi apunta a: `https://luna-tarot-liart.vercel.app/api/whatsapp`
- Número de WhatsApp del bot: **+54 9 11 5000 2372**

## Variables de entorno (Vercel)

| Variable | Descripción |
|---|---|
| `ANTHROPIC_API_KEY` | API key de Anthropic |
| `WHAPI_TOKEN` | Bearer token del canal Whapi |
| `REDIS_URL` | URL completa de Redis (ioredis) |
| `ALIAS` | Alias CBU para pagos (default: `estudiolunatarot`) |
| `CUIT` | CUIT del titular (default: `23-39211722-9`) |
| `TITULAR` | Nombre del titular (default: `Ezequiel Mosquera`) |
| `ADMIN_WHATSAPP` | Número admin para revisión manual de pagos (default: `5491132851143`) |
| `TOLERANCIA_PAGO` | Tolerancia en pesos para validar comprobante (default en precios.json: 500) |
| `BASE_URL` | (ya no se usa — imágenes servidas desde GitHub raw CDN) |

## Estructura de archivos

```
api/
  whatsapp.js        — Handler principal del webhook (toda la lógica del bot)
  cron.js            — Cron job: dispara la entrada de Luna tras el delay simulado
config/
  prompts.js         — getSofiaPrompt() y getLunaPrompt()
  cartas.js          — tirarCartas(), nombreCarta(), detectarTema()
  conocimiento-cartas.js — getConocimientoTirada(): conocimiento detallado por carta (78 cartas completas)
  precios.json       — Servicios, packs y tolerancia_pago
lib/
  session-store.js   — getSession(), saveSession(), deleteSession() con Redis/Map
  anthropic.js       — chat(systemPrompt, historial, mensajeUsuario, maxTokens?) con claude-sonnet-4-6
public/
  cartas/            — 78 imágenes JPG del mazo Rider-Waite (servidas vía GitHub raw CDN)
scripts/
  descargar-cartas.js — Script one-shot para descargar las 78 cartas desde Wikimedia Commons
vercel.json          — maxDuration: 60s (límite del plan Hobby — NO subir)
.github/workflows/
  luna-cron.yml      — GitHub Actions: dispara /api/cron cada 5 minutos
```

## Flujo del bot (etapas de sesión)

```
bienvenida
  → Sofía se presenta y menciona los servicios disponibles
  → etapa: esperando_eleccion

esperando_eleccion
  → Claude (haiku) detecta si el mensaje es elección de servicio
  → Si elige: Sofía confirma + sistema manda datos de pago automáticamente
  → Si no elige claramente: Sofía sugiere servicios con IA y pasa a confirmando_eleccion
  → etapa: esperando_comprobante / confirmando_eleccion

confirmando_eleccion
  → clasificarIntentConfirmacion() (Haiku) decide si la clienta confirma el/los servicios sugeridos
  → Si confirma: flujo de pago normal
  → Si no: Sofía responde naturalmente, sigue en confirmando_eleccion

esperando_comprobante
  → Usuario manda imagen/documento del comprobante
  → Claude (sonnet) analiza la imagen y verifica el monto
  → Si válido: avanza a pidiendo_nombre
  → Si inválido: notifica al admin por WhatsApp, etapa: verificando_pago

verificando_pago
  → Admin responde "APROBAR <numero>" o "RECHAZAR <numero>"
  → Si aprueba: avanza al paso que corresponda según datos ya guardados

pidiendo_nombre
  → Sofía pregunta NOMBRE COMPLETO. Se guarda session.nombreCompleto y session.nombre (primer nombre).
  → etapa: pidiendo_fecha

pidiendo_fecha
  → Sofía pregunta fecha de nacimiento (para carta_astral: también hora y ciudad).
  → Se guarda session.fechaNacimiento.
  → etapa: pidiendo_contexto

pidiendo_contexto
  → Sofía pide contexto para Luna. Se guarda session.contextoPorCliente.
  → Se calcula delay aleatorio (15s–45s): session.lunaDebeEscribirEn
  → etapa: esperando_luna

esperando_luna
  → Sofía mantiene al cliente mientras espera
  → El cron job (api/cron.js) revisa periódicamente y dispara iniciarLuna()
  → También se dispara si el cliente escribe y ya pasó el delay

con_luna — DOS PASOS para servicios con tirada
  PASO 1 (cartasEnviadas = false):
    → Luna entra ya con datos corroborados (iniciarLuna los recogió)
    → Se tiran las cartas, se envían como IMÁGENES por WhatsApp (GitHub raw CDN)
    → Se guarda session.cartasLanzadas y session.cartasEnviadas = true
    → Luna dice "mirá bien cada carta. cuando estés lista, escribime y empezamos"

  PASO 2 (cartasEnviadas = true, datosBiograficos != 'leido'):
    → Clienta responde → se genera la lectura completa con Claude (max 4096 tokens)
    → Si la lectura se genera OK: session.datosBiograficos = 'leido', etapa: upsell
    → Si Claude falla/timeout: sesión NO se actualiza → clienta puede reenviar y reintentar

  Servicios sin tirada (datosBiograficos = false):
    → Luna lee directamente, sin cartas. Mínimo 4 mensajes con |||.
    → etapa: upsell

upsell
  → Luna continúa respondiendo y ofrece servicios adicionales de forma orgánica
```

**Reset de sesión**: `reset` reinicia desde cualquier etapa. Saludos (hola, buenas, etc.) reinician solo desde etapas de pago trabadas (`esperando_comprobante`, `verificando_pago`).

## Datos del cliente en sesión

```js
session.nombre              // primer nombre (para referencias de Sofía)
session.nombreCompleto      // nombre y apellido completo (para Luna)
session.fechaNacimiento     // fecha de nacimiento como string (para Luna)
session.contextoPorCliente  // lo que el cliente quiere consultar
session.historialConsulta   // = contextoPorCliente || primer mensaje en con_luna
session.datosBiograficos    // = 'leido' cuando la lectura ya fue entregada exitosamente
session.lunaRecopiloData    // true cuando Luna ya entró y corroboró datos
session.cartasLanzadas      // array de IDs de cartas tiradas (ej: ['el_loco', '3_copas', ...])
session.cartasEnviadas      // true una vez que las imágenes fueron enviadas en PASO 1
session.agregadoContexto    // texto extra que la clienta agregó al confirmar el arranque
session.resumenSofia        // historial Sofía→clienta como string (para contexto de Luna)
session.serviciosSeleccionados // array de servicios confirmados [{key, nombre, precio}]
session.montosPagados       // array de montos pagados (para packs multi-sesión)
```

## Imágenes de cartas

Las 78 imágenes del mazo Rider-Waite están en `public/cartas/` como `{id}.jpg` (ej: `el_loco.jpg`, `3_copas.jpg`).

Se sirven desde **GitHub raw CDN**:
```
https://raw.githubusercontent.com/agustinmbanchero/luna-tarot/main/public/cartas/{id}.jpg
```

La función `urlCarta(cartaId)` en `whatsapp.js` construye esta URL. Para regenerar las imágenes si se agregan cartas: `node scripts/descargar-cartas.js`.

**Importante**: la URL de Vercel (`/cartas/`) no funciona para Whapi porque Vercel no sirve archivos estáticos desde `/public/` en planes Hobby. GitHub raw sí funciona.

## lib/anthropic.js

```js
const MAX_TOKENS = 4096; // default global
async function chat(systemPrompt, historial, mensajeUsuario, maxTokens = MAX_TOKENS)
```

- `maxTokens` es opcional. Las llamadas de lectura de Luna pasan `4096` explícitamente.
- `trimHistorial` limita a los últimos 20 turnos para no exceder contexto.

## Lógica de iniciarLuna()

`iniciarLuna(numero, session, mensajeClienteMientrasEsperaba)`:
1. Setea `etapa = 'con_luna'` y `lunaRecopiloData = true`
2. Construye `datosTexto` con `nombreCompleto` + `fechaNacimiento` de la sesión
3. Llama a Claude para que Luna se presente, corrobore los datos y pregunte si quiere agregar algo
4. **PENDIENTE (bug R1)**: el primer `saveSession` está antes del `chat()` — mismo bug que se corrigió en el PASO 2. Si hay timeout, la sesión queda en `con_luna` con `lunaRecopiloData: true` sin historial de presentación.

## Lógica de case 'con_luna'

```
!lunaRecopiloData → fallback: corroborar/pedir datos (caso borde)
lunaRecopiloData + necesitaCartas + !cartasEnviadas → PASO 1: tirar y enviar imágenes
lunaRecopiloData + necesitaCartas + cartasEnviadas + datosBiograficos != 'leido' → PASO 2: lectura
lunaRecopiloData + !datosBiograficos (servicio sin tirada) → lectura directa
else → conversación en curso con Luna (upsell, followup)
```

La instrucción de lectura siempre incluye:
- `Consulta de ${nombreCompleto}, fecha de nacimiento: ${fechaNacimiento}`
- `Quiere saber sobre: "${historialConsulta}"`
- Cartas con posiciones: `1. raíz / qué te trajo hasta acá: El Loco` / etc.
- Si la clienta agregó algo relevante: `También agregó: "..."`

## Personajes

### Sofía (recepcionista)
- Atiende desde `bienvenida` hasta `pidiendo_contexto`
- Tono: informal, rioplatense, minúsculas, máximo 1-2 oraciones
- Recolecta: nombre completo → fecha de nacimiento → contexto (en ese orden)
- No hace lecturas de tarot, no menciona que es bot ni IA
- Detección de servicios: `detectarServicioConIA()` (Haiku) para elección directa, `clasificarIntentConfirmacion()` (Haiku) para confirmaciones

### Luna (tarotista)
- Entra en `con_luna` con todos los datos ya recopilados por Sofía
- **Corrobora datos** al entrar (nunca llega "a ciegas")
- Tono: autoridad tranquila, directa, cálida, rioplatense, sin emojis
- **Estructura de lectura**: apertura → carta por carta (con posición) → síntesis → mensaje final → upsell orgánico
- Cada interpretación de carta debe citar al menos un detalle concreto de lo que la clienta dijo
- Usa fecha de nacimiento una vez en la apertura (signo solar o número de vida si calza naturalmente)
- **Cuándo pregunta**: primero lee, después pregunta. Máx 1 pregunta por mensaje.
- **Cuando el cliente rechaza**: 3 movimientos (firme / usa el rechazo / reencuadra). NUNCA se disculpa.
- Upsell orgánico al cerrar (nunca como catálogo)

## Integración Whapi

### Webhook entrante

`POST /api/whatsapp` recibe:
```json
{
  "messages": [{
    "from": "5491112345678@s.whatsapp.net",
    "from_me": false,
    "type": "text|image|document",
    "text": { "body": "..." },
    "image": { "link": "https://...", "caption": "..." },
    "document": { "link": "https://...", "caption": "..." }
  }]
}
```
- Se ignoran mensajes donde `from_me: true`
- Tipos no manejados (sticker, audio, video) devuelven `200 OK` sin procesar ni responder

### Envío de mensajes

```js
// Texto
POST https://gate.whapi.cloud/messages/text
{ "to": "...", "body": "texto" }

// Imagen
POST https://gate.whapi.cloud/messages/image
{ "to": "...", "media": "https://...", "caption": "nombre de carta" }
```

Múltiples mensajes: separados con `|||` en la respuesta de Claude, enviados en secuencia con 1200ms de pausa entre cada uno.

## Cron job (entrada de Luna)

- `api/cron.js` es llamado por GitHub Actions (`.github/workflows/luna-cron.yml`) cada 5 minutos
- Busca sesiones en estado `esperando_luna` donde `lunaDebeEscribirEn` ya pasó
- Dispara `iniciarLuna()` con la misma lógica que `whatsapp.js`
- **Nota**: GitHub Actions puede demorar hasta 10-15 min (cola de GitHub). Por eso Sofía le dice "escribime en un ratito y te la paso" — la clienta también puede triggerear Luna escribiendo un mensaje después del delay mínimo.

## Servicios y precios (precios.json)

Servicios individuales: `pregunta_puntual` ($3.000), `tirada_simple` ($5.000), `tirada_completa` ($9.000), `desbloqueo_caminos` ($8.000), `corte_lazos` ($8.000), `proteccion_amor` ($7.000), `proteccion_economica` ($7.000), `carta_astral` ($25.000).

Packs combinados: `pack_claridad` ($18.000), `pack_amor_total` ($28.000), `pack_exito` ($30.000), `pack_transformacion` ($35.000), `pack_completo` ($50.000).

Packs de preguntas: `pack_inicio` 5p ($12.000), `pack_media` 10p ($20.000), `pack_avanzado` 15p ($27.000), `pack_total` 20p ($32.000).

Tolerancia de pago: $500.

## Límites técnicos críticos

- **Vercel Hobby: maxDuration = 60s** — NO superar, la función se mata y la sesión puede corromperse.
- **Desglose de tiempo en PASO 2** (lectura con 7 cartas):
  - Claude con 4096 max tokens: ~20–40s (depende de carga de Anthropic)
  - `enviarMensajesMultiples` con 10 mensajes y 1200ms de pausa: ~12s
  - Margen ajustado — si Claude tarda 45s+ bajo carga, hay riesgo de timeout
- **Costo real por llamada**: una tirada completa (7 cartas) consume ~1.500–2.000 tokens de input + ~850–1.200 tokens de output en claude-sonnet-4-6 ≈ $0.03–0.06 USD por consulta.

## Bugs conocidos pendientes de fix

### Críticos
- **R1** — `iniciarLuna()`: primer `saveSession` está antes del `chat()`. Si hay timeout, sesión queda en `con_luna` con `lunaRecopiloData: true` pero sin mensaje de Luna. La clienta cae directo a tirar cartas sin corroboración.
- **R2** — Redis sin try/catch en `session-store.js`: si Redis cae, la excepción llega al handler global → mensaje de la clienta perdido para siempre.
- **R3** — `enviarImagen()` nunca lanza error: fallos de Whapi (401, 500) son silenciosos. El try/catch del PASO 1 nunca dispara. Las imágenes pueden no llegar sin ningún log ni fallback.
- **R4** — Admin manda `APROBAR` sin número → `getSession(undefined)` → escribe `session:undefined` en Redis.
- **UX1** — Clienta que escribe "hola" días después queda atrapada en `con_luna`/`upsell` y Luna responde out-of-context. No hay TTL de sesión ni reset por inactividad.

### Medios
- **UX2** — Audios y stickers ignorados en silencio (crítico en etapa de comprobante).
- **UX3** — Datos de pago no incluyen el nombre del titular de la cuenta.
- **UX4** — Sofía pregunta contexto como si no recordara lo que la clienta ya contó antes.
- **UX5** — Mensaje de comprobante inválido suena acusatorio en lugar de técnico.
- **UX6** — Packs de preguntas: `pack_inicio` no matchea cuando la clienta dice "5 preguntas".
- **Q1** — Posiciones de la tirada no tienen significado definido en el prompt → Luna interpreta cartas sueltas, no en sistema.
- **Q2** — Cartas de figuras (Reina, Rey, Paje): no hay instrucción sobre si representan a la clienta o a alguien en su vida.
- **Q3** — Conocimiento débil en `paje_espadas`, `la_justicia`, `4_espadas`, `8_bastos`.
- **Q4** — Síntesis y mensaje final sin ejemplos de qué NO hacer → riesgo de clichés de autoayuda.

## Principio de diseño clave

**No dejar a Claude inventar mensajes críticos.** Los mensajes que siempre deben decir exactamente lo mismo (datos de pago, pedido de comprobante, pedido de nombre/fecha) son strings hardcodeados en el código, no generados por Claude. Claude solo genera contenido conversacional donde el tono importa más que el contenido exacto.

## Dependencias relevantes (package.json)

- `@anthropic-ai/sdk` ^0.36.3
- `ioredis` ^5.10.1
- Node.js >=18.x
