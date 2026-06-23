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
  session-store.js   — getSession(), saveSession(), deleteSession(), getPreguntasRestantes(),
                       setPreguntasRestantes(), decrementarPregunta(), marcarMensajeProcesado()
                       (dedup), adquirirLock()/liberarLock() (lock por número) — con Redis/Map
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
  → Si la clienta ya contó algo en el primer mensaje, Sofía lo reconoce antes de presentarse
  → etapa: esperando_eleccion

esperando_eleccion
  → detectarServicioConIA() (Haiku) detecta si el mensaje es elección explícita de servicio
  → esPreguntaPrecio: si solo pregunta precio sin intención de comprar, Sofía responde sin avanzar
  → detectarMensajeConversacional() (Haiku): si es chat casual, Sofía responde sin sugerir servicios
  → Si elige: Sofía confirma + sistema manda datos de pago automáticamente
  → Si no elige claramente: sugerirServiciosConIA() sugiere 2-3 opciones → confirmando_eleccion
  → etapa: esperando_comprobante / confirmando_eleccion

confirmando_eleccion
  → clasificarIntentConfirmacion() (Haiku) decide si confirma los servicios sugeridos
  → Si cambia de servicio durante la conversación: serviciosSugeridos se actualiza
  → Si confirma: flujo de pago normal
  → Si no: Sofía responde naturalmente, sigue en confirmando_eleccion

esperando_comprobante
  → Usuario manda imagen/documento del comprobante
  → Claude (sonnet) analiza la imagen y verifica el monto
  → Si llega un PDF: NO se manda a Claude Vision (no lo lee) — se pide una captura de pantalla y se sigue esperando
  → Si válido: avanza a pidiendo_datos (o a pidiendo_contexto si ya tiene nombre+fecha). Si el servicio es pack_preguntas, inicializa contador Redis.
  → Si inválido: notifica al admin por WhatsApp, etapa: verificando_pago
  → Si la clienta cambia de servicio acá (texto): se actualiza serviciosSeleccionados + servicio (display) + precio
  → Stickers/audios/video: aviso humano ("los videos no me llegan bien, contame por texto") con cooldown 20s anti-repetición

verificando_pago
  → Admin responde "APROBAR <numero>" o "RECHAZAR <numero>"
  → Si aprueba: avanza a pidiendo_datos (o pidiendo_contexto si ya tiene datos).
                Si es pack_preguntas, inicializa contador Redis.
  → Validaciones: número requerido, sesión debe estar en verificando_pago

pidiendo_datos  (UN solo paso: nombre + fecha juntos)
  → Sofía pide nombre completo Y fecha de nacimiento en un solo mensaje (carta astral: también hora y ciudad)
  → extraerDatosCliente() (Haiku) parsea {nombreCompleto, fechaNacimiento, horaNacimiento, ciudadNacimiento} del texto libre
  → Si falta alguno: Sofía repregunta SOLO lo que falta, sigue en pidiendo_datos
  → Cuando tiene nombre y fecha: guarda session.nombreCompleto/nombre/fechaNacimiento → etapa: pidiendo_contexto

pidiendo_contexto
  → Sofía pide contexto para Luna. Se guarda session.contextoPorCliente.
  → lunaDebeEscribirEn = now + 20s. Manda el cierre de Sofía, espera ~20s EN LA MISMA invocación
    y dispara iniciarLuna() (Luna entra sola, la clienta NO tiene que reescribir).
  → etapa: esperando_luna

esperando_luna
  → Luna entra sola a ~20s desde pidiendo_contexto (disparo in-function). El cron (api/cron.js)
    queda como RED DE SEGURIDAD por si la función murió antes de disparar.
  → Si la clienta escribe mientras espera: Sofía la tranquiliza (NUNCA le pide reescribir).
  → Guard anti-doble-disparo: `session.lunaIniciando` (+ `lunaIniciandoEn`, TTL 90s) evita que
    el disparo in-function y el cron presenten a Luna dos veces. Se setea ANTES del chat y se
    libera después (o al expirar el TTL, para no trabar a Luna si hubo timeout).

con_luna — TRES PATHS según servicio
  Detección de path por KEY, no por nombre: se usa session.serviciosSeleccionados[].key
  (ej: 'pregunta_puntual', 'carta_astral', packs). session.servicio guarda el nombre display.
  PATH 0 — pregunta_puntual (serviciosSeleccionados incluye key 'pregunta_puntual', !cartasEnviadas):
    → Tira 1 carta, envía imagen, genera lectura directa en el MISMO burst (sin PASO 1/PASO 2)
    → Máx 2-3 mensajes con |||. Respuesta concreta, sin apertura larga.
    → Si Claude falla: sesión no se toca → reintento posible
    → etapa: upsell

  PATH 1 — tirada_simple / tirada_completa, DOS PASOS:
    PASO 1 (cartasEnviadas = false):
      → Luna entra ya con datos corroborados (iniciarLuna los recogió)
      → Se tiran 3 o 7 cartas con posiciones, se envían como IMÁGENES (GitHub raw CDN)
      → Se guarda session.cartasLanzadas y session.cartasEnviadas = true
      → Luna dice "mirá bien cada carta. cuando estés lista, escribime y empezamos"
    PASO 2 (cartasEnviadas = true, datosBiograficos != 'leido'):
      → Clienta responde → lectura completa con Claude (max 4096 tokens, slice(-8) de historial)
      → Posiciones: raíz/presente/obstáculo/fortaleza/influencias/próximos pasos/resultado (7c)
                    pasado/presente/futuro (3c)
      → Si historialConsulta es trivial ("dale", "ok"): instrucción especial para que Luna pregunte
      → Si lectura OK: session.datosBiograficos = 'leido', etapa: upsell
      → Si Claude falla/timeout: sesión NO se actualiza → clienta puede reenviar y reintentar

  PATH 2 — servicios sin tirada (desbloqueo, corte de lazos, protección, carta_astral):
    → Luna lee directamente, sin cartas. Mínimo 4 mensajes con |||.
    → Excepción carta_astral: lectura astrológica estructurada de mínimo 12 mensajes
      (signo solar, luna, ascendente si hay hora, casas según el contexto, nodo norte,
      número de vida, año personal, patrón, mensaje del momento, acción, cierre+upsell).
    → etapa: upsell

upsell
  → Si es pack_preguntas: verifica contador Redis antes de responder
    - restantes <= 0: Luna ofrece recarga sin responder la consulta nueva
    - restantes > 0: decrementa y responde normalmente
    - Redis no disponible (restantes === null): responde sin bloquear + console.warn de trazabilidad
  → Luna continúa respondiendo y ofrece servicios adicionales de forma orgánica
```

**Reset de sesión**:
- `reset` reinicia desde cualquier etapa.
- Saludos simples ("hola", "buenas") reinician SOLO desde `esperando_comprobante` (clienta trabada sin haber mandado nada). **NO** resetea en `verificando_pago` — ahí la clienta ya mandó comprobante y está en revisión del admin; un saludo no debe borrarle el pago.
- Saludos después de 12h de inactividad reinician desde etapas avanzadas (`con_luna`, `upsell`, `esperando_luna`, `pidiendo_contexto`).

## Datos del cliente en sesión

```js
session.nombre              // primer nombre (para referencias de Sofía)
session.nombreCompleto      // nombre y apellido completo (para Luna y lecturas)
session.fechaNacimiento     // fecha de nacimiento como string (para Luna)
session.contextoPorCliente  // lo que el cliente quiere consultar (guardado en pidiendo_contexto)
session.historialConsulta   // = contextoPorCliente || primer mensaje en con_luna (si trivial → vacío)
session.datosBiograficos    // = 'leido' cuando la lectura ya fue entregada exitosamente
session.lunaRecopiloData    // true cuando Luna ya entró y corroboró datos
session.lunaIniciando       // guard: true mientras webhook/cron está disparando la entrada de Luna
session.lunaIniciandoEn     // timestamp del guard (TTL 90s para no trabar a Luna si hay timeout)
session.cartasLanzadas      // array de IDs de cartas tiradas (ej: ['el_loco', '3_copas', ...])
session.cartasEnviadas      // true una vez que las imágenes fueron enviadas
session.agregadoContexto    // texto extra que la clienta agregó al confirmar el arranque
session.serviciosSeleccionados // array de servicios confirmados [{key, nombre, precio}] — FUENTE DE VERDAD para detectar el servicio (por .key, NO por session.servicio)
session.serviciosSugeridos  // array de servicios que Sofía sugirió (esperando_eleccion → confirmando_eleccion)
session.servicio            // NOMBRE display del/los servicio(s) ("Tirada simple", "Pack Amor Total"). Solo para mostrar/prompt, nunca para detectar lógica
session.precioServicio      // monto total a cobrar (suma de serviciosSeleccionados)
session.montosPagados       // array de montos pagados (también gate de "¿pagó?": length===0 bloquea la entrada de Luna)
session.lunaDebeEscribirEn  // timestamp a partir del cual Luna puede entrar (delay simulado)
session.ultimaActividad     // timestamp del último mensaje (para reset por inactividad 12h)
session.esClienteNuevo      // false una vez que ya interactuó/pagó
session.historialChat       // array {role, content} de toda la conversación (se recorta a 40)
session.bufferFragmentos    // fragmentos de texto acumulados durante la ventana de debounce
session.debounceMsgId       // id del último mensaje recibido (para que solo el último responda)
session.ultimoAvisoMediaEn  // timestamp del último aviso "no veo videos/stickers" (cooldown anti-repetición)
```

**Nota**: `resumenSofia` ya NO se guarda en sesión. Se calcula dinámicamente con `buildResumenSofia(session.historialChat)` en cada llamada a `getLunaPrompt`. Filtra mensajes de pago (alias, montos, comprobante) para que Luna reciba solo contexto conversacional relevante.

## Contador de preguntas (packs_preguntas)

Los packs de preguntas tienen su contador en **Redis separado** con TTL de 30 días:
- Key: `preguntas:{numero}` — independiente de la sesión conversacional (que expira en 24h)
- Se inicializa al confirmar pago (comprobante automático o APROBAR del admin)
- Se decrementa en cada respuesta de Luna en el case `upsell`
- Cuando llega a 0, Luna ofrece recarga en lugar de responder la consulta

Funciones en `lib/session-store.js`: `getPreguntasRestantes(numero)`, `setPreguntasRestantes(numero, cantidad)`, `decrementarPregunta(numero)`.

## Perfil del cliente (identidad persistente)

Independiente de la sesión (24h), guarda la **identidad** de cada número con TTL de **1 año**:
- Key Redis: `cliente:{numero}` → `{ nombre, nombreCompleto, fechaNacimiento, ultimaVez }`
- Se guarda (merge, nunca pisa con null) en `pidiendo_datos` apenas se capturan nombre/fecha.
- Al arrancar una sesión nueva (`etapa === 'bienvenida' && !nombre`), `procesarMensaje` busca el perfil:
  si existe, carga nombre/fecha y pone `esClienteNuevo = false` → Sofía saluda "hola de nuevo, {nombre}"
  y en una próxima compra NO vuelve a pedir los datos (cae directo a `pidiendo_contexto` tras pagar).
- NO preserva el historial de la charla vieja — solo la identidad (recordar quién es, no retomar).
- Funciones en `lib/session-store.js`: `getPerfilCliente(numero)`, `guardarPerfilCliente(numero, datos)`.

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
1. Llama a Claude para que Luna se presente, corrobore los datos y pregunte si quiere agregar algo
2. Solo si `chat()` tiene éxito: setea `etapa = 'con_luna'`, `lunaRecopiloData = true`, guarda historial y llama `saveSession`
3. Si hay timeout antes de `chat()`: sesión no se modifica → el próximo mensaje de la clienta reintenta

`cron.js` implementa la misma lógica directamente (no importa `iniciarLuna` de whatsapp.js). Tiene `try/catch` por sesión individual — si una sesión falla, el loop continúa con las demás.

## Lógica de case 'con_luna'

```
servicio === 'pregunta_puntual' + !cartasEnviadas → PATH 0: 1 carta + lectura directa burst
!lunaRecopiloData                                 → fallback: corroborar/pedir datos (caso borde)
necesitaCartas + !cartasEnviadas                  → PASO 1: tirar y enviar imágenes
necesitaCartas + cartasEnviadas + !leido          → PASO 2: lectura completa
!datosBiograficos (servicio sin tirada)           → PATH 2: lectura directa
else                                              → conversación en curso con Luna (upsell, followup)
```

La instrucción de lectura siempre incluye:
- `Consulta de ${nombreCompleto}, fecha de nacimiento: ${fechaNacimiento}`
- `Quiere saber sobre: "${historialConsulta}"` (o instrucción de preguntar si está vacío)
- Cartas con posiciones: `1. raíz / qué te trajo hasta acá: El Loco` / etc.
- Si la clienta agregó algo relevante: `También agregó: "..."`

## Personajes

### Sofía (recepcionista)
- Atiende desde `bienvenida` hasta `pidiendo_contexto`
- Tono: informal, rioplatense, minúsculas, máximo 1-2 oraciones, emojis variados con moderación
- Recolecta: nombre+fecha JUNTOS (un paso, parseados por extraerDatosCliente con Haiku) → contexto. Siempre pasando por Claude con historialChat para mantener continuidad
- Reconoce lo que la clienta ya contó (no pregunta como si no lo supiera)
- No hace lecturas de tarot, no menciona que es bot ni IA
- Detección de servicios: `detectarServicioConIA()` (Haiku) para elección directa, `clasificarIntentConfirmacion()` (Haiku) para confirmaciones, `detectarMensajeConversacional()` (Haiku) para chat casual

### Luna (tarotista)
- Entra en `con_luna` con todos los datos ya recopilados por Sofía
- **Corrobora datos** al entrar (nunca llega "a ciegas")
- Tono: autoridad tranquila, directa, cálida, rioplatense, SIN EMOJIS
- **Estructura de lectura**: apertura (con mención de signo/numerología si calza) → carta por carta con posición → síntesis → mensaje final accionable → upsell orgánico
- Cada interpretación de carta cita al menos un detalle concreto de lo que la clienta dijo
- **Cuándo pregunta**: primero lee, después pregunta. Máx 1 pregunta por mensaje.
- **Cuando el cliente rechaza**: 3 movimientos (firme / usa el rechazo / reencuadra). NUNCA se disculpa.
- Upsell orgánico al cerrar (nunca como catálogo)
- Largo mínimo: tirada simple 6 msgs |||, tirada completa 10 msgs |||, sin tirada 4 msgs |||

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
- Tipos no manejados (sticker, audio, video): aviso humano ("los videos/stickers no me llegan bien, contame por texto") con cooldown de 20s para no repetirlo si mandan varios seguidos

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

`enviarImagen()` lanza error si Whapi devuelve status no-OK — el try/catch del llamador lo captura.

## Cron job (entrada de Luna) — RED DE SEGURIDAD

- La entrada de Luna ahora se dispara **in-function** desde `pidiendo_contexto`: tras ~20s en la misma
  invocación del webhook, se llama a `iniciarLuna()`. Luna entra sola, la clienta no reescribe.
- `api/cron.js` (GitHub Actions cada 5 min) queda como **fallback**: si la función del webhook murió
  antes de disparar (timeout, crash), el cron toma esa sesión `esperando_luna` con `lunaDebeEscribirEn`
  vencido y la dispara. El guard `lunaIniciando` evita doble disparo.
- Tiene `try/catch` por sesión individual y libera el guard en el catch para permitir reintento.

## Servicios y precios (precios.json)

Servicios individuales: `pregunta_puntual` ($3.000 — 1 carta + lectura directa), `tirada_simple` ($5.000 — 3 cartas), `tirada_completa` ($9.000 — 7 cartas), `desbloqueo_caminos` ($8.000), `corte_lazos` ($8.000), `proteccion_amor` ($7.000), `proteccion_economica` ($7.000), `carta_astral` ($25.000).

Packs combinados: `pack_claridad` ($18.000), `pack_amor_total` ($28.000), `pack_exito` ($30.000), `pack_transformacion` ($35.000), `pack_completo` ($50.000).

Packs de preguntas (con contador Redis 30d): `pack_inicio` 5p ($12.000), `pack_media` 10p ($20.000), `pack_avanzado` 15p ($27.000), `pack_total` 20p ($32.000).

Tolerancia de pago: $500.

## Límites técnicos críticos

- **Vercel Hobby: maxDuration = 60s** — NO superar, la función se mata y la sesión puede corromperse.
- **Desglose de tiempo en PASO 2** (lectura con 7 cartas):
  - Claude con 4096 max tokens: ~20–40s (depende de carga de Anthropic)
  - `enviarMensajesMultiples` con 10 mensajes y 1200ms de pausa: ~12s
  - Margen ajustado — si Claude tarda 45s+ bajo carga, hay riesgo de timeout
- **Costo real por llamada**: una tirada completa (7 cartas) consume ~1.500–2.000 tokens de input + ~850–1.200 tokens de output en claude-sonnet-4-6 ≈ $0.03–0.06 USD por consulta.

## Problemas conocidos pendientes

- **Race condition general**: dos mensajes rápidos del mismo número podían disparar dos Vercel functions en paralelo que pisaban la sesión.
  - **Mitigado con lock por número**: `adquirirLock`/`liberarLock` (Redis `SET NX` + TTL 30s) envuelven `manejarMensaje` (wrapper sobre `procesarMensaje`). Queda una ventana TOCTOU mínima si el lock no se obtiene tras un reintento, pero alcanza a bajo volumen.
  - **Idempotencia de webhooks**: `marcarMensajeProcesado(msg.id)` (Redis `SET NX` TTL 300s) al inicio del handler descarta reintentos de Whapi (que ocurren cuando tardamos >X en responder 200, p.ej. lecturas largas o el hold de 20s de Luna). Sin esto, el mismo mensaje se procesaba dos veces.
  - **Entrada de Luna**: el guard `lunaIniciando` (+ `lunaIniciandoEn`, TTL 90s) evita que el disparo in-function y el cron presenten a Luna dos veces.

## Principio de diseño clave

**No dejar a Claude inventar mensajes críticos.** Los mensajes que siempre deben decir exactamente lo mismo (datos de pago, pedido de comprobante) son strings hardcodeados en el código, no generados por Claude. Claude solo genera contenido conversacional donde el tono importa más que el contenido exacto.

**saveSession siempre DESPUÉS de chat().** Si Claude falla o hay timeout, la sesión no debe quedar en un estado avanzado sin el mensaje correspondiente. El patrón correcto: `respuesta = await chat(...)` → actualizar sesión → `saveSession`.

**Idempotencia + lock al entrar.** Todo webhook pasa por `marcarMensajeProcesado(msg.id)` (descarta reintentos de Whapi) y `manejarMensaje` adquiere un lock por número antes de procesar. Indispensable porque algunas respuestas tardan (lecturas largas, hold de 20s de Luna) y Whapi reintenta si no recibe el 200 a tiempo.

**Envío resiliente.** `enviarMensajesMultiples` reintenta una vez por mensaje y no aborta el burst si uno falla — así una lectura no se corta a la mitad por un fallo puntual de Whapi.

**Debounce de mensajes (DEBOUNCE_MS = 15s).** La gente escribe en varios mensajes cortos. Cada fragmento de TEXTO se acumula en `session.bufferFragmentos` y se marca `debounceMsgId`; la función espera 15s (FUERA del lock) y, si llegó un mensaje más nuevo, aborta sin responder. Solo el último fragmento combina todo el buffer en un mensaje y responde. Las imágenes/documentos (comprobantes) NO se debouncen — se procesan al instante. Constante fácil de ajustar al inicio de `whatsapp.js`. Nota: suma 15s a cada respuesta de texto; en `pidiendo_contexto` se acumula con el hold de 20s de Luna (total ~35s hasta que Luna entra), dentro del margen de 60s de Vercel — si Anthropic se pone lento, el cron de respaldo cubre la entrada de Luna.

## Dependencias relevantes (package.json)

- `@anthropic-ai/sdk` ^0.36.3
- `ioredis` ^5.10.1
- Node.js >=18.x
