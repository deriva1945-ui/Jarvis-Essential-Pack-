# Historial de cambios · Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Versiones según [SemVer](https://semver.org/lang/es/).
Format based on Keep a Changelog. Versions follow SemVer.

Cada versión del pack agrupa las versiones de los mods que cambian. · Each pack version groups the mod versions that change.

## [0.5.0] - 2026-11-14

Pack `jarvis-essential-pack` 0.5.0: consumo 0.10.0 con las disposiciones y el botón de moneda, repaso interno del código de los otros cuatro mods (portero 0.2.1, resumen-sesion 0.2.1, jarvis-banda 0.3.1 y mods-estado 0.4.1) e imágenes al día. · consumo 0.10.0 with layouts and the currency button, an internal code tidy-up of the other four mods (portero 0.2.1, resumen-sesion 0.2.1, jarvis-banda 0.3.1 and mods-estado 0.4.1) and up-to-date images.

### consumo 0.10.0

Agrupa las versiones 0.9.0 (disposiciones) y 0.10.0 (botón de moneda) del HUD. · Groups HUD versions 0.9.0 (layouts) and 0.10.0 (currency button).

- **ES:** **Nueve disposiciones** de los paneles con la opción `disposicion`: `auto` (la de siempre, por defecto), `columna`, `franja`, `tres-columnas`, `nucleo-central`, `barra-lateral`, `barra-inferior`, `mosaico` y `foco`. Nuevas opciones `orden`, `tamanos` (`panel:pequeno|normal|grande`), `escala` (0.8 a 1.4), `ocultos` y `ventana` (tamaño de la ventana de Edge o Chrome: `auto`, `pequena`, `mediana`, `grande` o `completa`). La página solo cambia atributos y CSS: no rehace paneles ni parpadea. Un valor no válido usa el defecto y deja un aviso en el log.
- **ES:** **Botón de moneda** en la cabecera (`€` / `US$`): cambia todos los costes entre euros y dólares al momento, sin recargar. La opción `moneda` es solo la inicial; la elección se recuerda en ese navegador (`localStorage`) y, si no se puede guardar, el botón funciona igual. Con euros no queda ninguna etiqueta `USD` en el HUD: leyenda de la gráfica y cabecera de la tabla llevan el símbolo de la moneda activa.
- **ES:** Se mantienen el histórico entre sesiones, los euros por defecto (`tipoCambio` 0.92 de referencia), el tema `monocromo` por defecto, la densidad automática, el movimiento reducido, la señal corregida y el HUD sin parpadeo.
- **EN:** **Nine panel layouts** with the `disposicion` option: `auto` (the usual one, by default), `columna`, `franja`, `tres-columnas`, `nucleo-central`, `barra-lateral`, `barra-inferior`, `mosaico` and `foco`. New options `orden`, `tamanos` (`panel:pequeno|normal|grande`), `escala` (0.8 to 1.4), `ocultos` and `ventana` (Edge or Chrome window size: `auto`, `pequena`, `mediana`, `grande` or `completa`). The page only changes attributes and CSS: no panel is rebuilt and nothing flickers. An invalid value uses the default and logs a warning.
- **EN:** **Currency button** in the header (`€` / `US$`): switches every cost between euros and dollars at once, without reloading. The `moneda` option is only the starting value; the choice is remembered in that browser (`localStorage`) and the button still works if it cannot be saved. In euros no `USD` label is left on the HUD: the chart legend and the table header carry the symbol of the active currency.
- **EN:** History across sessions, euros by default (`tipoCambio` 0.92 as reference), the `monocromo` default theme, automatic density, reduced motion, the fixed signal and the flicker-free HUD all stay.

### portero 0.2.1, resumen-sesion 0.2.1, jarvis-banda 0.3.1 y mods-estado 0.4.1

- **ES:** Repaso interno del código, sin cambios de comportamiento, textos ni opciones: helpers repetidos unificados, código y exports sin uso fuera, nombres de parámetros coherentes.
- **EN:** Internal code tidy-up with no change in behaviour, text or options: repeated helpers merged, unused code and exports removed, consistent parameter names.

### Imágenes · Images

- **ES:** HUD (1920 × 1080, 900 × 600, 420 × 860, crítico, plan completo y comparativas) con el botón de moneda y el bloque Acumulado; las cuatro capturas de la banda con el modelo y el contexto en la línea; `/mods` y `/resumen` con su formato actual. Todas en blanco, grises y negro, con texto de 4,5:1 o más y menos de 500 KB. Los ejemplos de terminal y de banda son HTML y lo indican.
- **EN:** HUD (1920 × 1080, 900 × 600, 420 × 860, critical, plan complete and comparisons) with the currency button and the Accumulated block; the four band images with the model and context on the line; `/mods` and `/resumen` in their current format. All in white, greys and black, with 4.5:1 text or more and under 500 KB. The terminal and band examples are HTML and say so.

## [0.4.0] - 2026-11-14

Pack `jarvis-essential-pack` 0.4.0: portero 0.2.0, resumen-sesion 0.2.0, consumo 0.8.0, jarvis-banda 0.3.0 y mods-estado 0.4.0, todo en estética monocroma. · portero 0.2.0, resumen-sesion 0.2.0, consumo 0.8.0, jarvis-banda 0.3.0 and mods-estado 0.4.0, all in a monochrome look.

### portero 0.2.0

- **ES:** Clasificación por capas: override, longitud, bloques de código y trazas, rutas de archivo, palabras clave pesadas, historial reciente (seguimientos cortos tras una petición pesada) y palabras clave ligeras. El modelo ligero solo decide lo que ninguna regla decide. Umbrales configurables.
- **ES:** Nuevo override **`!dudosa`**: ruta pesada con el doble de contexto. Los atajos `!pesada`, `!ligera` y `!dudosa` se quitan del texto antes de llegar al modelo.
- **ES:** Registro local de decisiones en `decisiones.jsonl` (opción **`dataDir`**, por defecto `~/CLAUDE/portero`): marca de tiempo, ruta, capa, motivo y texto recortado con secretos evidentes tapados. Nada sale del equipo.
- **ES:** Nuevos comandos **`/portero`** (reparto de rutas, reglas que más disparan, últimos casos) y **`/portero reglas`** (reglas activas).
- **ES:** Opciones `userConfig`: `heavyModel` (`opus` o `fable`), `classifierModel`, `heavyLength`, `lightLength`, una por regla (`ruleLength`, `ruleCode`, `rulePaths`, `ruleKeywords`, `ruleHistory`), `contextMessages`, `contextChars`, `logEnabled`, `logMaxEntries` y `logTextChars`.
- **ES:** Contexto para el subagente limitado por mensajes y caracteres, sin mensajes vacíos, confirmaciones ni el propio mensaje actual.
- **ES:** Si el clasificador falla, la ruta es pesada y el registro guarda un aviso.
- **EN:** Layered classification: override, length, code blocks and traces, file paths, heavy keywords, recent history (short follow-ups after a heavy request) and light keywords. The light model only decides what no rule decides. Configurable thresholds.
- **EN:** New **`!dudosa`** override: heavy route with twice the context. The `!pesada`, `!ligera` and `!dudosa` shortcuts are removed from the text before it reaches the model.
- **EN:** Local decision log in `decisiones.jsonl` (**`dataDir`** option, `~/CLAUDE/portero` by default): timestamp, route, layer, reason and cut text with obvious secrets masked. Nothing leaves the machine.
- **EN:** New **`/portero`** (route split, rules that fire most, latest cases) and **`/portero reglas`** (active rules) commands.
- **EN:** `userConfig` options: `heavyModel` (`opus` or `fable`), `classifierModel`, `heavyLength`, `lightLength`, one per rule (`ruleLength`, `ruleCode`, `rulePaths`, `ruleKeywords`, `ruleHistory`), `contextMessages`, `contextChars`, `logEnabled`, `logMaxEntries` and `logTextChars`.
- **EN:** Subagent context capped by messages and characters, skipping empty messages, acknowledgements and the current message itself.
- **EN:** If the classifier fails, the route is heavy and the log keeps a warning.
- **ES:** El informe de `/portero` y `/portero reglas` sale en blanco y grises, con barras de texto (█ llena, ░ vacía) en el reparto de rutas y por capa.
- **EN:** The `/portero` and `/portero reglas` report is drawn in white and greys, with text bars (█ full, ░ empty) for the route and layer split.

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
- **ES:** La salida de `/resumen` y `/resumen-ver` se dibuja en blanco y grises; el texto que se copia no cambia.
- **EN:** The `/resumen` and `/resumen-ver` output is drawn in white and greys; the text you copy is unchanged.

### consumo 0.8.0

Agrupa las versiones 0.5.0 a 0.8.0 del HUD. · Groups HUD versions 0.5.0 to 0.8.0.

- **ES:** **Histórico entre sesiones:** `historico.json` en `dataDir` con los totales desde el primer uso (coste, tokens de entrada, salida y caché, turnos, por modelo y por tipo de agente), los días y las últimas sesiones; solo cifras y nombres, nunca el texto de las peticiones. Nuevo bloque **Acumulado** en el HUD: hoy, esta semana, total y últimas sesiones con coste y duración. Opciones `historico` (por defecto `true`) y `retencionDias` (365). Escritura segura con `historico.tmp.json`; un archivo roto se aparta y el HUD sigue.
- **ES:** **Costes en euros:** opciones `moneda` (`EUR` por defecto, o `USD`) y `tipoCambio` (euros por dólar, 0.92 de referencia, sin consultas a internet). El coste se guarda en dólares y la página lo convierte solo al mostrarlo, en todas las cifras: panel Coste, último turno, comparativa, gráfica, tablas y Acumulado. Formato de moneda del idioma (`1.234,56 €` en español, `€1,234.56` en inglés).
- **ES:** **Tema `monocromo` por defecto:** blanco, grises y negro, sin acento; el globo, el anillo y el núcleo 3D siguen, en grises; aviso alto con borde discontinuo y crítico invertido con doble borde. Los demás temas (`natural`, `hibrido`, `mark-ii`, `mark-l`, `stark`, `claro`) se eligen con la opción `tema`.
- **ES:** **Personalización** con `userConfig`: `tema`, `acento`, `idioma` (`es` o `en`), `actualizacion` (1 a 5 s) y `paneles`. Un valor no válido usa el defecto y deja un aviso en el log.
- **ES:** **Densidad automática** según el tamaño de la ventana (sin modo compacto manual ni opción `densidad`; un valor antiguo se ignora). En compacto se quitan los efectos, la mitad de partículas del globo, los últimos turnos y el pie.
- **ES:** **Sin parpadeo:** la página solo cambia los nodos que cambian. **Movimiento reducido:** sin animaciones ni transiciones si el sistema lo pide. Foco visible, texto de 14 px como mínimo y contraste de 4,5:1 o más.
- **ES:** **Señal corregida:** "Sin señal" solo tras 10 s sin latido nuevo y 3 lecturas seguidas sin él; una lectura fallida suelta no lo enciende.
- **ES:** `/jarvis` sigue siendo el único comando del mod.
- **EN:** **History across sessions:** `historico.json` in `dataDir` with totals since first use (cost, input, output and cache tokens, turns, per model and per agent type), the days and the latest sessions; only figures and names, never prompt text. New **Accumulated** block in the HUD: today, this week, total and latest sessions with cost and length. Options `historico` (default `true`) and `retencionDias` (365). Safe writes through `historico.tmp.json`; a broken file is set aside and the HUD carries on.
- **EN:** **Costs in euros:** options `moneda` (`EUR` by default, or `USD`) and `tipoCambio` (euros per dollar, 0.92 as reference, never looked up online). Cost is stored in dollars and the page converts it only when showing it, in every figure: Cost panel, last turn, comparison, chart, tables and Accumulated. Currency format of the language (`1.234,56 €` in Spanish, `€1,234.56` in English).
- **EN:** **`monocromo` theme by default:** white, greys and black, no accent; the 3D globe, ring and core stay, in greys; high warning with a dashed border and critical inverted with a double border. The other themes (`natural`, `hibrido`, `mark-ii`, `mark-l`, `stark`, `claro`) are picked with the `tema` option.
- **EN:** **Customisation** through `userConfig`: `tema`, `acento`, `idioma` (`es` or `en`), `actualizacion` (1 to 5 s) and `paneles`. An invalid value falls back to the default and logs a warning.
- **EN:** **Automatic density** from the window size (no manual compact mode or `densidad` option; an old value is ignored). Compact drops effects, half the globe particles, the latest turns and the footer.
- **EN:** **No flicker:** the page only touches the nodes that change. **Reduced motion:** no animations or transitions when the system asks for it. Visible focus, 14 px minimum text and 4.5:1 contrast or more.
- **EN:** **Signal fixed:** "Sin señal" (no signal) only after 10 s without a new heartbeat and 3 reads in a row without one; a single failed read does not trigger it.
- **EN:** `/jarvis` is still the mod's only command.

### jarvis-banda 0.3.0

- **ES:** Estados nuevos: pensando (razonamiento visible), esperando permiso y error en herramienta, cada uno con su símbolo de una columna; siete en total.
- **ES:** Modelo activo y contexto usado en la misma línea. Pulso: el símbolo se invierte unos 600 ms en cada cambio de estado.
- **ES:** **Color monocromo por defecto**, como el HUD de consumo: Opus en blanco (`#ffffff`), Haiku y Fable en gris medio (`#a3a3a3`), otros modelos en gris claro (`#d4d4d4`); el error, única alerta con color, en rojo apagado. `colorOpus`, `colorHaiku`, `colorFable` y `colorOtro` siguen como opciones.
- **ES:** Opciones `userConfig`: `idioma` (`es` o `en`), `modo` (completo, compacto u oculto), colores por familia de modelo, `mostrarModelo`, `mostrarContexto` y `animacion`.
- **ES:** Nuevo comando **`/banda`** para cambiar idioma o modo solo en la sesión (`/banda es`, `/banda compacto`, `/banda reset`…).
- **EN:** New states: thinking (visible reasoning), awaiting permission and tool error, each with its own one-column symbol; seven in total.
- **EN:** Active model and context used on the same line. Pulse: the symbol inverts for about 600 ms on each state change.
- **EN:** **Monochrome colour by default**, like the consumo HUD: Opus in white (`#ffffff`), Haiku and Fable in mid grey (`#a3a3a3`), other models in light grey (`#d4d4d4`); the error, the only coloured alert, in muted red. `colorOpus`, `colorHaiku`, `colorFable` and `colorOtro` are still options.
- **EN:** `userConfig` options: `idioma` (`es` or `en`), `modo` (full, compact or hidden), colours per model family, `mostrarModelo`, `mostrarContexto` and `animacion`.
- **EN:** New **`/banda`** command to change language or mode for the session only (`/banda en`, `/banda compacto`, `/banda reset`…).

### mods-estado 0.4.0

- **ES:** `/mods` muestra una tabla del pack: por cada mod, estado (activo, desactivado, falló al cargar, no instalado), versión instalada (de `claude plugin list --json`, con la salida de texto como respaldo), versión de la copia local (del `plugin.json` en `modsDir`) y `≠` si no coinciden. mods-estado aparece como "en uso" si se cargó con `--plugin-dir`.
- **ES:** Avisos: mods del pack que fallaron al cargar, con el texto del error y una sugerencia; versiones distintas entre la copia local y la instalada; mods sin cargar; y restos del marketplace antiguo `portero-claude`, con los comandos para limpiarlos (no borra nada).
- **ES:** Nuevo `/mods actualizar` (o `update`): muestra los comandos exactos para actualizar los mods instalados y la copia local (`git pull` y copia con `cp -R` o `robocopy`), sin ejecutarlos. Nuevo `/mods ayuda` (o `help`).
- **ES:** Nueva opción **`idioma`** (`es` o `en`). `modsDir` sigue igual.
- **EN:** `/mods` shows a pack table: for each mod, its state (active, disabled, failed to load, not installed), installed version (from `claude plugin list --json`, falling back to the text output), local copy version (from `plugin.json` in `modsDir`) and `≠` when they differ. mods-estado shows as "in use" when loaded with `--plugin-dir`.
- **EN:** Warnings: pack mods that failed to load, with the error text and a suggestion; version differences between the local copy and the installed one; mods not loaded; and leftovers from the old `portero-claude` marketplace, with the commands to clean them up (it deletes nothing).
- **EN:** New `/mods update` (or `actualizar`): shows the exact commands to update the installed mods and the local copy (`git pull` and a copy with `cp -R` or `robocopy`), without running them. New `/mods help` (or `ayuda`).
- **EN:** New **`idioma`** option (`es` or `en`). `modsDir` is unchanged.
- **ES:** Presentación monocroma: la salida de `/mods` se dibuja en blanco y grises, sin color de acento (`[x]` y `[ ]` en blanco, `[!]` en negrita, `[?]` en gris), con una línea bajo el encabezado y cada aviso empezando por "Aviso:".
- **EN:** Monochrome presentation: the `/mods` output is drawn in white and greys with no accent colour (`[x]` and `[ ]` in white, `[!]` in bold, `[?]` in grey), with a rule under the header and each warning starting with "Warning:".

### Documentación e imágenes · Docs and images

- **ES:** Imágenes del pack en estética monocroma y distintivos del README en grises. README raíz y `docs/` al día con las versiones, los comandos (`/jarvis`, `/portero`, `/resumen`, `/resumen-ver`, `/banda`, `/mods`) y las carpetas de datos de cada mod.
- **EN:** Pack images in a monochrome look and README badges in greys. Root README and `docs/` updated with the versions, the commands (`/jarvis`, `/portero`, `/resumen`, `/resumen-ver`, `/banda`, `/mods`) and each mod's data folder.

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

[0.5.0]: https://github.com/deriva1945-ui/portero-claude/tree/publicar-pack
[0.4.0]: https://github.com/deriva1945-ui/portero-claude/commit/20b15f8
[0.3.0]: https://github.com/deriva1945-ui/portero-claude/tree/main
[0.2.0]: https://github.com/deriva1945-ui/portero-claude/commit/8d12284
[0.1.0]: https://github.com/deriva1945-ui/portero-claude/commit/1bff027
