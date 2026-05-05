# CLAUDE.md — Bot WhatsApp: Estudio de Tarot Luna

## Descripción del proyecto

Bot de WhatsApp para el **Estudio de Tarot Luna** (cliente: Ezequiel Mosquera).
Simula dos personajes: **Sofía** (recepcionista) y **Luna** (tarotista), con flujo de cobro previo a la consulta.

## Stack

- **Runtime**: Node.js (serverless, Vercel)
- **WhatsApp API**: Whapi.cloud — webhook + envío de mensajes
- **IA**: Anthropic Claude (claude-sonnet-4-6 para chat, claude-haiku-4-5 para detección de servicios)
- **Sesiones**: Redis via ioredis (`REDIS_URL`). Fallback a Map en memoria si no hay Redis.
- **Deploy**: Vercel, auto-deploy desde rama `main`
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
| `BASE_URL` | URL base para imágenes de cartas (default: `https://luna-tarot-liart.vercel.app`) |

## Estructura de archivos

```
api/
  whatsapp.js        — Handler principal del webhook (toda la lógica del bot)
  cron.js            — Cron job: dispara la entrada de Luna tras el delay simulado
config/
  prompts.js         — getSofiaPrompt() y getLunaPrompt()
  cartas.js          — tirarCartas(), nombreCarta(), detectarTema()
  conocimiento-cartas.js — getConocimientoTirada(): conocimiento detallado por carta
  precios.json       — Servicios, packs y tolerancia_pago
lib/
  session-store.js   — getSession(), saveSession(), deleteSession() con Redis/Map
  anthropic.js       — chat(systemPrompt, historial, mensajeUsuario) con claude-sonnet-4-6
vercel.json          — maxDuration: 60s para todas las funciones
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
  → etapa: esperando_comprobante

esperando_comprobante
  → Usuario manda imagen/documento del comprobante
  → Claude (sonnet) analiza la imagen y verifica el monto
  → Si válido: avanza a pidiendo_nombre (o pidiendo_fecha / pidiendo_contexto si ya tiene datos)
  → Si inválido: notifica al admin por WhatsApp, etapa: verificando_pago

verificando_pago
  → Admin responde "APROBAR <numero>" o "RECHAZAR <numero>"
  → Si aprueba: avanza al paso que corresponda según datos ya guardados

pidiendo_nombre
  → Sofía pregunta NOMBRE COMPLETO. Se guarda session.nombreCompleto y session.nombre (primer nombre).
  → etapa: pidiendo_fecha

pidiendo_fecha  ← NUEVA ETAPA
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

con_luna
  → Luna entra: corrobora los datos del cliente (nombreCompleto + fechaNacimiento) y
    pregunta si quiere agregar algo antes de arrancar.
  → Cliente responde → si el servicio tiene tirada: se tiran cartas y se envían imágenes.
  → Lectura usando session.nombreCompleto, session.fechaNacimiento, session.historialConsulta.
  → Tras la lectura: etapa: upsell

upsell
  → Luna continúa respondiendo y ofrece servicios adicionales de forma orgánica
```

**Reset de sesión**: `reset` reinicia desde cualquier etapa. Saludos (hola, buenas, etc.) reinician solo desde etapas de pago trabadas.

## Datos del cliente en sesión

```js
session.nombre          // primer nombre (para referencias de Sofía)
session.nombreCompleto  // nombre y apellido completo (para Luna)
session.fechaNacimiento // fecha de nacimiento como string (para Luna)
session.contextoPorCliente // lo que el cliente quiere consultar
session.historialConsulta  // = contextoPorCliente || primer mensaje en con_luna
session.datosBiograficos   // marca que ya se hizo la lectura (= fechaNacimiento)
session.lunaRecopiloData   // true cuando Luna ya confirmó datos y espera el "arrancar"
session.cartasLanzadas     // array de IDs de cartas tiradas
session.resumenSofia       // historial previo a luna como string
```

## Lógica de iniciarLuna()

`iniciarLuna(numero, session, mensajeClienteMientrasEsperaba)`:
1. Setea `etapa = 'con_luna'` y `lunaRecopiloData = true`
2. Construye `datosTexto` con nombreCompleto + fechaNacimiento de la sesión
3. Instruye a Claude: presentarse cálidamente + **corroborar los datos** de forma natural + preguntar si quiere agregar algo antes de arrancar
4. NO le dice que "ya tiene lista la tirada" (eso sería imposible sin datos)
5. El próximo mensaje del cliente dispara la lectura directamente

## Lógica de case 'con_luna'

```
!lunaRecopiloData → fallback: corroborar/pedir datos (borde)
lunaRecopiloData + necesitaCartas → tirar cartas y leer (usando session.nombreCompleto + session.fechaNacimiento)
lunaRecopiloData + !datosBiograficos → servicio sin tirada → leer directamente
else → conversación en curso con Luna
```

La instrucción de lectura siempre incluye:
- `Consulta de ${nombreCompleto}, fecha de nacimiento: ${fechaNacimiento}`
- `Quiere saber sobre: "${historialConsulta}"`
- Si el cliente agregó algo relevante: `También agregó: "..."`

## Personajes

### Sofía (recepcionista)
- Atiende desde `bienvenida` hasta `pidiendo_contexto`
- Tono: informal, rioplatense, minúsculas, máximo 1-2 oraciones
- Recolecta: nombre completo → fecha de nacimiento → contexto (en ese orden)
- No hace lecturas de tarot, no menciona que es bot ni IA

### Luna (tarotista)
- Entra en `con_luna` con todos los datos ya recopilados por Sofía
- **Corrobora datos** al entrar (nunca llega "a ciegas")
- Tono: autoridad tranquila, directa, cálida, rioplatense, sin emojis
- **Cuándo pregunta**: primero lee, después pregunta. Máx 1 pregunta por mensaje. Las preguntas nacen de las cartas, no son genéricas.
- **Cuando el cliente rechaza**: 3 movimientos definidos:
  1. Se mantiene firme ("las cartas no mienten, aunque a veces dicen lo que menos queremos ver")
  2. Usa el rechazo como información ("interesante que eso no resuene. contame...")
  3. Reencuadra (misma carta, otra capa de lectura)
  - NUNCA se disculpa ni tira la lectura a la basura
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
- Tipos no manejados (sticker, audio, video) devuelven 200 OK sin procesar

### Envío de mensajes

```js
POST https://gate.whapi.cloud/messages/text
Authorization: Bearer <WHAPI_TOKEN>
{ "to": "5491112345678@s.whatsapp.net", "body": "texto" }
```

Múltiples mensajes: separados con `|||` en la respuesta de Claude, enviados en secuencia con 1200ms de pausa.

## Cron job (entrada de Luna)

- `api/cron.js` es llamado por GitHub Actions (`.github/workflows/luna-cron.yml`) cada 5 minutos
- Busca sesiones en estado `esperando_luna` donde `lunaDebeEscribirEn` ya pasó
- Dispara `iniciarLuna()` con la misma lógica que `whatsapp.js`
- **Nota**: GitHub Actions puede demorar hasta 10-15 min en ejecutar el cron (cola de GitHub). Por eso Sofía le dice al cliente "escribime en un ratito y te la paso" — el cliente también puede triggerear Luna escribiendo un mensaje después del delay.

## Servicios y precios (precios.json)

Servicios individuales: pregunta_puntual ($3.000), tirada_simple ($5.000), tirada_completa ($9.000), desbloqueo_caminos ($8.000), corte_lazos ($8.000), proteccion_amor ($7.000), proteccion_economica ($7.000), carta_astral ($25.000).

Packs combinados: pack_claridad ($18.000), pack_amor_total ($28.000), pack_exito ($30.000), pack_transformacion ($35.000), pack_completo ($50.000).

Packs de preguntas: pack_inicio 5p ($12.000), pack_media 10p ($20.000), pack_avanzado 15p ($27.000), pack_total 20p ($32.000).

Tolerancia de pago: $500.

## Dependencias relevantes (package.json)

- `@anthropic-ai/sdk` ^0.36.3
- `ioredis` ^5.10.1
- Node.js >=18.x

## Principio de diseño clave

**No dejar a Claude inventar mensajes críticos.** Los mensajes que siempre deben decir exactamente lo mismo (datos de pago, pedido de comprobante, pedido de nombre/fecha) son strings hardcodeados en el código, no generados por Claude. Claude solo genera contenido conversacional donde el tono importa más que el contenido exacto.
