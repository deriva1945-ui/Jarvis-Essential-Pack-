# Historial de cambios · Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Versiones según [SemVer](https://semver.org/lang/es/).
Format based on Keep a Changelog. Versions follow SemVer.

Cada versión del pack agrupa las versiones de los mods que cambian. · Each pack version groups the mod versions that change.

## [Sin publicar] · Unreleased

### resumen-sesion 0.2.0

- **ES:** Resumen de traspaso en **secciones fijas**: objetivo, decisiones tomadas, archivos tocados (rutas únicas), comandos ejecutados relevantes, errores vistos y pendientes. El modelo ligero escribe objetivo, decisiones y pendientes a partir de los últimos mensajes; archivos, comandos y errores salen de los datos reales de las herramientas.
- **ES:** Dos disparadores: **automático** al volver a escribir tras un tiempo sin actividad (como antes; no actúa con la sesión parada) y **bajo demanda** con el nuevo comando **`/resumen`**.
- **ES:** El último resumen se guarda con su fecha en **`<dataDir>/ultimo-resumen.md`** (por defecto `~/CLAUDE/resumen-sesion`). Nuevo comando **`/resumen-ver`** para verlo, también en otra sesión.
- **ES:** Sugerencia de sesión nueva con el **texto listo para copiar** entre dos marcas.
- **ES:** Opciones de `userConfig`: `idleHours` (por defecto 2), `maxTokens` (800), `includeFiles` (sí), `language` (`es` o `en`) y `dataDir`.
- **ES:** Degradación limpia: si el modelo falla, se avisa con el motivo, el último resumen guardado no se toca, se da un resumen parcial con los datos de herramientas y el automático se reintenta una vez en el siguiente mensaje.
- **ES:** Corrección: los mensajes se leen con la forma de `$.session.messages()` (`text`), no con `content`.
- **EN:** Handover summary in **fixed sections**: goal, decisions made, files touched (unique paths), relevant commands run, errors seen and pending. The light model writes goal, decisions and pending from the last messages; files, commands and errors come from the real tool data.
- **EN:** Two triggers: **automatic** when you type again after a period of inactivity (as before; it does not act while the session is idle) and **on demand** with the new **`/resumen`** command.
- **EN:** The last summary is saved with its date to **`<dataDir>/ultimo-resumen.md`** (default `~/CLAUDE/resumen-sesion`). New **`/resumen-ver`** command to show it, also from another session.
- **EN:** New-session suggestion with the **copy-ready text** between two markers.
- **EN:** `userConfig` options: `idleHours` (default 2), `maxTokens` (800), `includeFiles` (yes), `language` (`es` or `en`) and `dataDir`.
- **EN:** Clean degradation: if the model fails, you get a warning with the reason, the last saved summary is left alone, a partial summary with the tool data is given and the automatic trigger retries once on the next message.
- **EN:** Fix: messages are read in the shape `$.session.messages()` returns (`text`), not `content`.

## [0.3.0] - 2026-11-12

Pack `jarvis-essential-pack` 0.3.0: consumo 0.4.0 y mods-estado 0.3.0. portero y resumen-sesion siguen en 0.1.0 y jarvis-banda en 0.2.0. · consumo 0.4.0 and mods-estado 0.3.0. portero and resumen-sesion stay at 0.1.0 and jarvis-banda at 0.2.0.

### consumo 0.4.0

- **ES:** Sin rutas fijas de Windows. Nueva opción **`dataDir`** (`userConfig` en `plugin.json`): la carpeta donde se escriben `index.html`, `datos.js`, `estado.json` y `estado.js`. Por defecto `~/CLAUDE/consumo`, con `~` como tu carpeta de usuario (`USERPROFILE` en Windows, `HOME` en macOS y Linux). Se cambia con `claude plugin configure consumo@jarvis-essential-pack`, con `/config` o, con `--plugin-dir`, en `pluginConfigs` de `settings.json`. Si no se conoce la carpeta de usuario, usa la carpeta `datos` del propio plugin.
- **ES:** La URL de la página se construye a partir de esa carpeta (con espacios y acentos codificados).
- **EN:** No fixed Windows paths. New **`dataDir`** option (`userConfig` in `plugin.json`): the folder where `index.html`, `datos.js`, `estado.json` and `estado.js` are written. Defaults to `~/CLAUDE/consumo`, with `~` as your user folder (`USERPROFILE` on Windows, `HOME` on macOS and Linux). Change it with `claude plugin configure consumo@jarvis-essential-pack`, with `/config` or, with `--plugin-dir`, under `pluginConfigs` in `settings.json`. If the user folder is unknown, it uses the plugin's own `datos` folder.
- **EN:** The page URL is built from that folder (spaces and accents encoded).

### mods-estado 0.3.0

- **ES:** Sin rutas fijas de Windows. Nueva opción **`modsDir`**: la carpeta de tu copia local del pack. Por defecto `~/CLAUDE/mods`. Se cambia igual que `dataDir` (`claude plugin configure mods-estado@jarvis-essential-pack`).
- **EN:** No fixed Windows paths. New **`modsDir`** option: the folder of your local copy of the pack. Defaults to `~/CLAUDE/mods`. Change it the same way as `dataDir` (`claude plugin configure mods-estado@jarvis-essential-pack`).

### Documentación · Docs

- **ES:** Los READMEs explican cómo configurar las carpetas. La función de PowerShell usa `$env:USERPROFILE`.
- **EN:** The READMEs explain how to configure the folders. The PowerShell function uses `$env:USERPROFILE`.

## [0.2.0] - 2026-11-12

Pack `jarvis-essential-pack` 0.2.0: consumo 0.3.0, jarvis-banda 0.2.0 y mods-estado 0.2.0. portero y resumen-sesion siguen en 0.1.0. · consumo 0.3.0, jarvis-banda 0.2.0 and mods-estado 0.2.0. portero and resumen-sesion stay at 0.1.0.

### consumo 0.3.0

- **ES:** Nuevo panel **Comparativa · Haiku frente a Opus**: coste real de la sesión, lo que habría costado si el trabajo de Haiku hubiera ido a Opus (con el coste por token de tus propios turnos) y el ahorro en USD y %. Sin más de 1000 tokens de cada modelo muestra "sin datos de Opus todavía" (o de Haiku) y no estima. Tokens y coste por modelo debajo.
- **ES:** Nuevo comando **`/jarvis`**: abre el HUD si está cerrado y lo cierra si está abierto. Escribe `estado.json` y `estado.js` en la carpeta de datos (entonces fija; configurable desde 0.4.0); la página los lee y llama a `window.close()`. Si la ventana no se cierra, muestra "HUD cerrado. Escribe /jarvis para abrirlo.". `/jarvis` es el único comando del mod (no hay `/consumo`).
- **ES:** Si no hay navegador, `/jarvis` explica el motivo y dice dónde está la página para abrirla a mano.
- **EN:** New **Haiku versus Opus comparison** panel: the session's real cost, what it would have cost if Haiku's work had gone to Opus (using the cost per token of your own turns), and the saving in USD and %. With 1000 tokens or fewer from either model it shows "sin datos de Opus todavía" (no Opus data yet, or Haiku) and estimates nothing. Tokens and cost per model below.
- **EN:** New **`/jarvis`** command: opens the HUD when closed and closes it when open. It writes `estado.json` and `estado.js` in the data folder (fixed then; configurable since 0.4.0); the page reads them and calls `window.close()`. If the window stays open, it shows "HUD cerrado. Escribe /jarvis para abrirlo.". `/jarvis` is the mod's only command (there is no `/consumo`).
- **EN:** With no browser, `/jarvis` explains why and says where the page is so you can open it by hand.

### consumo 0.2.0

- **ES:** Estética blanco-cian sobre fondo azul-negro, con nebulosa y rejilla de perspectiva. Barra de progreso del plan de Claude (`TaskCreate` / `TaskUpdate`) arriba, con la lista plegable. Rojo solo para alertas.
- **EN:** White-cyan look on a blue-black background, with a nebula and a perspective grid. Progress bar for Claude's plan (`TaskCreate` / `TaskUpdate`) at the top, with a collapsible list. Red only for alerts.

### jarvis-banda 0.2.0

- **ES:** Queda en una sola línea con el estado en vivo y su símbolo (◌ ◐ ◑ ◒). Al delegar muestra el tipo y el modelo del subagente, con su color.
- **EN:** Down to a single line with the live state and its symbol (◌ ◐ ◑ ◒). While delegating it shows the subagent's type and model, in that model's color.

### mods-estado 0.2.0

- **ES:** `/mods on <nombre>` y `/mods off <nombre>` ejecutan `claude plugin enable` o `claude plugin disable` (probando también `claude.cmd`). Solo aceptan los nombres del pack. El cambio vale desde la próxima sesión.
- **EN:** `/mods on <name>` and `/mods off <name>` run `claude plugin enable` or `claude plugin disable` (also trying `claude.cmd`). Only pack names are accepted. The change applies from the next session.

## [0.1.0] - 2026-11-12

Primera publicación del pack `jarvis-essential-pack`. · First release of the `jarvis-essential-pack`.

### portero 0.1.0

- **ES:** Clasifica cada petición con reglas y, si dudan, con Haiku. Lo ligero lo responde el modelo de la sesión; lo pesado se delega a un subagente Opus. Atajos `!pesada` y `!ligera`.
- **EN:** Classifies each request with rules and, when unsure, with Haiku. Light work stays on the session model; heavy work goes to an Opus subagent. `!pesada` and `!ligera` shortcuts.

### resumen-sesion 0.1.0

- **ES:** Tras 2 horas sin actividad, al volver a escribir, Haiku crea un resumen de traspaso y un aviso sugiere abrir una sesión nueva.
- **EN:** After 2 idle hours, when you type again, Haiku writes a handover summary and a notice suggests starting a new session.

### consumo 0.1.0

- **ES:** Ventana HUD en directo con contexto, coste, tokens por agente y modelo, reparto entre modelos, últimos 20 turnos, alertas al 70 % y 85 %, aviso de "sin señal" y modo compacto. Diseño adaptable desde 420 px.
- **EN:** Live HUD window with context, cost, tokens per agent and model, model split, last 20 turns, alerts at 70 % and 85 %, "no signal" notice and compact mode. Responsive from 420 px.

### jarvis-banda 0.1.0

- **ES:** Línea encima del prompt con el estado en vivo (esperando, procesando, ejecutando, delegando) y color por modelo. Ver 0.2.0 arriba.
- **EN:** Line above the prompt with the live state (waiting, processing, running, delegating) and color per model. See 0.2.0 above.

### mods-estado 0.1.0

- **ES:** Comando `/mods`: ejecuta `claude plugin list`, marca los mods del pack y mira la copia local del pack (carpeta fija entonces; configurable desde 0.3.0).
- **EN:** `/mods` command: runs `claude plugin list`, marks the pack mods and checks the local copy of the pack (fixed folder then; configurable since 0.3.0).

[0.3.0]: https://github.com/deriva1945-ui/portero-claude/tree/main
[0.2.0]: https://github.com/deriva1945-ui/portero-claude/commit/8d12284
[0.1.0]: https://github.com/deriva1945-ui/portero-claude/commit/1bff027
