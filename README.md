# portero-claude

Mod para Claude Code que clasifica cada petición antes de responder.

- **Ligera** (traducciones, formato, preguntas cortas): la resuelve el modelo de la sesión, sin subagentes.
- **Pesada** (arquitectura, depuración, análisis, varios archivos): se delega en un subagente con Opus (o Fable), con los últimos mensajes como contexto.
- **Dudosa**: va a la ruta pesada. Ante la duda, sube de modelo.

Primero aplica reglas (longitud, bloques de código, palabras clave, nombres de archivo). Solo si no decide, consulta a Haiku.

## Atajos
- `!pesada ...` fuerza la ruta pesada.
- `!ligera ...` fuerza la ruta ligera.

## Instalación
```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install portero@jarvis-essential-pack
```

Para cambiar el modelo pesado, edita `HEAVY_MODEL` en `hooks/register.tsx` (`opus` o `fable`).

## Límites
- No cambia el modelo del hilo principal. Si la sesión está en Opus, lo ligero también corre en Opus. Pon la sesión en Haiku con `/model` para ahorrar.
- El subagente solo ve los últimos mensajes, no todo el historial.

## resumen-sesion

Segundo plugin de este repo. Tras 2 horas sin escribir, genera un resumen de traspaso con Haiku y sugiere retomar en una sesión nueva. Instalación:

```
/plugin install resumen-sesion@jarvis-essential-pack
```
