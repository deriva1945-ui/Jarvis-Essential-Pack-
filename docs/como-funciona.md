# Cómo funciona por dentro

**Español** · [English](how-it-works.md) · [← Volver al README](../README.md)

Los cinco mods siguen el mismo camino: **eventos → hooks → datos → pantalla**.

![Arquitectura: eventos, hooks, datos y pantalla](../images/arquitectura.png)

## Las cuatro piezas

| Pieza | Qué es |
|---|---|
| **Eventos** | Claude Code avisa de lo que pasa: `session.start` (empieza la sesión), `prompt.submit` (envías un mensaje), `tool.call` (corre una herramienta), `agent.spawn` (nace un subagente), `turn.complete` (termina un turno), `ui.render` (se dibuja una zona de la pantalla) y `command.run` (escribes un comando del mod). |
| **Hooks** | Cada mod tiene un archivo `hooks/register.tsx`. Ahí dice qué eventos escucha y qué hace con cada uno. |
| **Datos** | Lo que el mod recuerda entre eventos. Es pequeño: una hora, unos contadores, una fase. `consumo`, `portero` y `resumen-sesion` además escriben archivos en su carpeta de datos. |
| **Pantalla** | Donde se ve el resultado: una línea, un aviso, una ventana HUD, un texto en el chat o el propio turno de Claude. |

## Mod a mod

| Mod | Escucha | Guarda | Muestra |
|---|---|---|---|
| [portero](../portero/) | `session.start`, `prompt.submit`, `agent.spawn`, `command.run` | la ruta del turno (ligera, pesada o dudosa) y el registro `decisiones.jsonl` | una nota en el turno, si es pesada un subagente Opus, la línea de estado y el informe de `/portero` |
| [resumen-sesion](../resumen-sesion/) | `session.start`, `turn.complete`, `prompt.submit`, `command.run` | la hora del último turno y `ultimo-resumen.md` | un resumen de traspaso de Haiku en el contexto, un aviso y la respuesta de `/resumen` y `/resumen-ver` |
| [consumo](../consumo/) | `session.start`, `turn.complete`, `tool.call`, `agent.spawn`, `command.run` | tokens, coste, turnos, plan, comparativa Haiku/Opus, acumulado entre sesiones y si el HUD está abierto; va a `datos.js`, `estado.js` e `historico.json` | una ventana HUD que recarga `datos.js` cada segundo y la respuesta de `/jarvis` |
| [jarvis-banda](../jarvis-banda/) | `session.start`, `prompt.submit`, `tool.call`, `tool.check`, `turn.step`, `agent.spawn`, `turn.complete`, `ui.render`, `command.run` | fase, herramienta, modelos, contexto y pulso | una línea monocroma encima del prompt y la respuesta de `/banda` |
| [mods-estado](../mods-estado/) | `session.start`, `command.run` | nada: lo calcula al momento | el diagnóstico de `/mods` y la respuesta de `/mods on`, `/mods off`, `/mods actualizar` y `/mods ayuda` |

## Reglas que cumplen todos

- **No rompen la sesión.** Si un mod falla, deja pasar el evento sin cambios.
- **Solo escuchan lo que necesitan.** Un mod no ve los eventos que no pide.
- **No guardan tu conversación entera.** Solo escriben en disco tres mods, cada uno en su carpeta de datos (opción `dataDir`):
  - `consumo` (`~/CLAUDE/consumo`): la página, `datos.js` (números, nombres de modelo, la descripción corta de cada subagente y los títulos de tareas del plan), `estado.json` / `estado.js` (si el HUD está abierto) e `historico.json` (solo cifras y nombres de modelos y de tipos de agente, nunca el texto de las peticiones). La página guarda además en el navegador (localStorage) solo tres preferencias de vista: la moneda elegida con el botón, y si la lista del plan y la de foco están abiertas.
  - `portero` (`~/CLAUDE/portero`): `decisiones.jsonl`, con la ruta, la capa, el motivo y el texto de la petición recortado y con los secretos evidentes tapados. Se apaga con `logEnabled`.
  - `resumen-sesion` (`~/CLAUDE/resumen-sesion`): `ultimo-resumen.md`, el último resumen de traspaso.
