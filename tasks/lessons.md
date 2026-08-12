# lessons.md — bucle de auto-mejora

Después de CUALQUIER corrección del usuario se agrega acá el **patrón** (no el incidente
puntual), escrito como una regla accionable para no repetir el error.

Se revisa al inicio de cada sesión sobre este proyecto.

## Formato

```
### <regla corta en imperativo>
- **Contexto**: dónde apareció el problema
- **Qué salió mal**: el patrón, no el detalle
- **Regla**: qué hacer siempre / nunca a partir de ahora
```

---

## Lecciones

### Detectar el servicio por `key`, nunca por el nombre display
- **Contexto**: `case 'con_luna'` en `api/whatsapp.js`
- **Qué salió mal**: ramificar la lógica según `session.servicio` (texto para mostrar)
  rompe cuando el nombre cambia o cuando hay varios servicios en un pack.
- **Regla**: la fuente de verdad es `session.serviciosSeleccionados[].key`.
  `session.servicio` es solo para mostrar y para el prompt.

### `saveSession` siempre DESPUÉS de `chat()`
- **Contexto**: todos los handlers que llaman a Anthropic
- **Qué salió mal**: avanzar la etapa antes de la llamada deja la sesión en un estado
  adelantado sin haber enviado el mensaje si Claude falla o hay timeout.
- **Regla**: `respuesta = await chat(...)` → actualizar sesión → `saveSession`.
  Si falla, la sesión queda intacta y la clienta puede reintentar.

### No dejar que Claude invente mensajes críticos
- **Contexto**: datos de pago (alias, CUIT, titular), pedido de comprobante
- **Qué salió mal**: contenido que debe ser idéntico siempre no puede depender de un LLM.
- **Regla**: hardcodear esos strings. Claude solo genera lo conversacional.
