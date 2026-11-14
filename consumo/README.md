<a id="es"></a>

# consumo

**Español** · [English](#en)

Abre una ventana HUD en directo con lo que gasta la sesión: contexto, coste y tokens. Siete temas de color (por defecto `monocromo`: blanco, grises y negro, sin color de acento, con el globo y el anillo 3D en grises; los demás, como `natural`, se eligen con la opción `tema`), con la barra del plan arriba y una comparativa de Haiku frente a Opus. El comando `/jarvis` abre o cierra el HUD, y las opciones de [Personalización](#es-personalizacion) cambian tema, acento, idioma, ritmo de lectura, paneles visibles y moneda (euros por defecto).

![HUD de consumo](../images/consumo-1920x1080.jpg)

## Qué hace

- Al iniciar la sesión abre una ventana aparte con Edge o Chrome en modo aplicación (`--app`).
- Arriba, una barra de progreso del plan de Claude (las tareas que crea y actualiza), con la lista plegable.
- Contexto usado y su porcentaje, coste acumulado y tokens por agente y por modelo.
- Reparto del trabajo entre modelos, gráfica de tokens por turno y los últimos 20 turnos.
- **Comparativa Haiku frente a Opus:** lo que costó la sesión y lo que habría costado si el trabajo enviado a Haiku hubiera ido a Opus, con el coste por token de tus propios turnos. Muestra el ahorro en la moneda del HUD (euros por defecto) y en %. Necesita más de 1000 tokens de cada modelo; si no, pone "sin datos de Opus todavía" (o de Haiku) y no estima nada.
- **Comando `/jarvis`:** abre el HUD si está cerrado y lo cierra si está abierto.
- Avisa cuando el contexto pasa del **70 %** y del **85 %**: por encima del 85 % el HUD entero pasa a rojo de alerta (en `monocromo`, sin color: alerta invertida y doble borde).
- Si pasan 10 segundos sin latido nuevo **y** van 3 lecturas seguidas sin él, marca "Sin señal". Una lectura fallida suelta no enciende el aviso, y el primer latido nuevo lo apaga.
- No parpadea: pinta los paneles una vez y después solo cambia los textos y barras que cambian. Si solo llega el latido, no toca nada.
- Funciona sin conexión: todo va dentro de la página.
- La densidad se ajusta sola al tamaño de la ventana. Con menos de 420 px de ancho o menos de 900 × 600 px de área pasa a compacta: quita los efectos de fondo, la mitad de las partículas del globo, los últimos turnos y el pie, y junta un poco los márgenes. Con más espacio vuelve el HUD completo. Cambia al redimensionar, sin recargar. No hay tecla ni opción para elegirla.
- Respeta la preferencia del sistema de reducir el movimiento: el globo y el anillo se quedan quietos, nada se anima y las cifras cambian sin deslizarse. Los datos se leen igual.
- Accesible: texto de 14 px como mínimo, contraste de 4,5:1 o más en los temas `natural` y `monocromo` y foco visible al moverse con el teclado.

Se adapta al tamaño de la ventana (cada panel se ajusta además por dentro según su propio ancho):

| Ancho | Diseño |
|---|---|
| 1600 px o más y 1000 px de alto | todo cabe sin desplazar: plan arriba, tres columnas y abajo la gráfica junto a los últimos turnos |
| 1200 px o más | tres columnas: contexto, coste y comparativa, reparto y agentes |
| 900 a 1199 px | dos columnas; reparto y agentes lado a lado |
| 560 a 899 px | contexto a la izquierda, coste y comparativa a la derecha; el resto a todo el ancho |
| menos de 560 px | una columna; funciona desde 320 px sin desplazamiento horizontal |

| 900 × 600 | 420 × 860 |
|---|---|
| ![900x600](../images/consumo-900x600.png) | ![420x860](../images/consumo-420x860.png) |

| Plan completo | Contexto crítico |
|---|---|
| ![Plan completo](../images/consumo-plan-completo.jpg) | ![Contexto crítico](../images/consumo-critico.jpg) |

| Comparativa con Haiku y Opus | Comparativa sin datos de Opus |
|---|---|
| ![Comparativa disponible](../images/comparativa-disponible-1920x1080.jpg) | ![Comparativa sin Opus](../images/comparativa-sin-opus-1920x1080.jpg) |

*Capturas con datos de ejemplo.*

## Comparativa Haiku frente a Opus

- **Real:** la suma del coste de los turnos de la sesión.
- **Todo en Opus:** el coste real, cambiando lo que costó Haiku por sus tokens al precio por token que ha tenido Opus en tus turnos.
- **Ahorro:** la diferencia, en la moneda del HUD y en %.
- Debajo, los tokens y el coste de cada modelo (Fable, Haiku, Opus…).
- Es una estimación: el caché y la mezcla de entrada y salida cambian el precio real por token. Un turno sin coste conocido no cuenta para el precio por token.

## Comando /jarvis

![/jarvis en la terminal](../images/jarvis-terminal.png)

`/jarvis` abre o cierra el HUD:

- Si el HUD está cerrado, lo abre como al iniciar la sesión (Edge o Chrome con `--app`).
- Si está abierto, lo cierra. El mod no cierra la ventana del navegador por su cuenta, porque tendría que matar procesos de Edge que no son suyos. En su lugar escribe `estado.json` en la [carpeta de datos](#es-carpeta) con `{"abierto": false}` (y `{"abierto": true}` antes de abrir). La página lo lee cada segundo y, al ver `abierto: false`, llama a `window.close()`.
- Si `window.close()` no cierra la ventana, la página muestra "HUD cerrado. Escribe /jarvis para abrirlo." **`window.close()` puede no funcionar en todas las versiones de Edge: en ese caso cierra la ventana a mano.**
- Si no hay navegador, `/jarvis` lo dice y te indica la ruta de `index.html` para que lo abras a mano.

El mod no tiene comando `/consumo`: `/jarvis` es su único comando.

## Cómo funciona

1. **Al iniciar la sesión** registra `/jarvis`, escribe la página `index.html` en la carpeta de datos y la abre con Edge (o Chrome si no hay Edge).
2. Escucha los eventos de **turno terminado**, **herramienta** y **subagente** (`turn.complete`, `tool.call`, `agent.spawn`).
3. En cada turno suma los tokens de entrada, salida y caché por agente y por modelo, y guarda los últimos 20 turnos. Un turno repetido no se cuenta dos veces.
4. El **coste** sale del contador de la propia sesión: el coste de un turno es lo que sube ese contador. No usa tabla de precios.
5. Las llamadas a `TaskCreate` y `TaskUpdate` alimentan la barra del plan.
6. Todo se escribe en `datos.js` (en la carpeta de datos) tras cada turno o herramienta, y además cada 3 segundos como latido.
7. **La página recarga `datos.js` cada segundo** (o cada `actualizacion` segundos) y cambia solo lo que cambió. Con 10 segundos sin latido nuevo y 3 lecturas seguidas sin él, muestra "Sin señal".
8. La página también carga `estado.js` con el mismo ritmo. Es una copia de `estado.json` en forma de script, porque el navegador no deja leer un `.json` desde `file://`.

Archivos que crea en tu PC, todos en la carpeta de datos: `index.html` (la página), `datos.js` (los datos), `estado.json` y `estado.js` (si el HUD está abierto).

## Cómo se instala

```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install consumo@jarvis-essential-pack
```

O cárgalo con `--plugin-dir` (ver el [README principal](../README.md#es-cargar)).

Requisitos: Windows con Edge o Chrome.

<a id="es-carpeta"></a>

## Carpeta de datos

La opción **`dataDir`** dice dónde se escriben `index.html`, `datos.js`, `estado.json` y `estado.js`.

- **Valor por defecto:** `~/CLAUDE/consumo`. `~` es tu carpeta de usuario: `%USERPROFILE%` en Windows (por ejemplo `C:\Users\<tú>\CLAUDE\consumo`), `$HOME` en macOS y Linux.
- Acepta una ruta absoluta o una que empiece por `~`. Una ruta relativa cuenta desde tu carpeta de usuario.
- La carpeta se crea sola si no existe.
- Si el mod no sabe cuál es tu carpeta de usuario (ni `USERPROFILE` ni `HOME`), usa la carpeta `datos` dentro del propio plugin.

Para cambiarla en un mod instalado:

```
claude plugin configure consumo@jarvis-essential-pack
```

Sin más argumentos muestra las opciones y su valor. Para guardar un valor nuevo, pásalo en JSON por la entrada estándar (en Windows usa `/` o dobla las `\\` dentro del JSON):

```
echo '{"dataDir": "~/CLAUDE/consumo"}' | claude plugin configure consumo@jarvis-essential-pack --values-stdin
```

También puedes cambiarla dentro de Claude Code con `/plugin configure consumo@jarvis-essential-pack` o en `/config`. Si cargas el mod con `--plugin-dir`, guarda el valor en `~/.claude/settings.json`:

```json
{ "pluginConfigs": { "consumo": { "options": { "dataDir": "~/CLAUDE/consumo" } } } }
```

El cambio se aplica al reiniciar Claude Code.

<a id="es-personalizacion"></a>

## Personalización

Además de `dataDir`, el HUD tiene estas opciones. Todas van a `datos.js` en el campo `config` (ya validadas), y la página las aplica al leerlo.

| Opción | Valores | Por defecto | Qué cambia |
| --- | --- | --- | --- |
| `tema` | `monocromo`, `natural`, `mark-ii`, `mark-l`, `stark`, `hibrido`, `claro` | `monocromo` | Tema de color del HUD (atributo `data-tema` de la página). |
| `acento` | color hex: `#rgb` o `#rrggbb` | `#7fe7ff` | Color de acento. Con el valor por defecto cada tema usa su propio acento; otro valor sustituye al del tema. |
| `idioma` | `es`, `en` | `es` | Idioma de las etiquetas, la hora y los números del HUD. Los nombres de agentes, modelos y tareas no se traducen. |
| `actualizacion` | número de segundos, de 1 a 5 | `1` | Cada cuánto la página vuelve a leer `datos.js`. |
| `paneles` | lista con `contexto`, `coste`, `reparto`, `agentes`, `historial`, `grafica`, `comparativa`, `plan` | todos | Paneles visibles. Si quitas alguno, los demás se recolocan sin huecos (en el orden del HUD). |
| `moneda` | `EUR`, `USD` | `EUR` | Moneda en la que se muestran todos los costes (panel Coste, último turno, comparativa, gráfica y tablas). Con `USD` se ven los dólares tal como los da Claude Code, sin convertir. |
| `tipoCambio` | número mayor que 0: euros por 1 dólar | `0.92` | Tipo de cambio para pasar a euros: coste en € = coste en $ × `tipoCambio` (con `0.92`, 1 USD son 0,92 €). Solo se usa con `moneda` = `EUR`. |

Los temas:

- `monocromo` (por defecto): solo blanco, grises y negro, sin ningún color de acento (la opción `acento` no se aplica). Paneles opacos sin brillo; el globo, el anillo y el núcleo 3D siguen, en grises. Contraste de 4,5:1 o más en todo el texto. El aviso alto lleva borde discontinuo; el crítico se ve invertido (negro sobre blanco), con doble borde y el panel de contexto más claro.
- `natural`: grafito cálido, texto marfil y un solo acento salvia; sin brillos, cristal, rejilla ni escaneo. Arriba, en una franja, contexto (globo, anillo y núcleo 3D), coste y comparativa; debajo, el detalle. Cifras de tabla en monoespaciada.
- `hibrido`: blanco-cian sobre azul-negro, con el anillo del globo en ámbar.
- `mark-ii`: cian eléctrico sobre azul-negro profundo, con más brillo.
- `mark-l`: blanco y celeste, paneles de cristal más claros.
- `stark`: ámbar y oro sobre carbón.
- `claro`: fondo claro con acentos en azul, para trabajar de día.

En todos los demás el rojo se reserva para las alertas. En las ventanas pequeñas (densidad compacta) los brillos, el desenfoque y el fondo animado se apagan.

Valores que no valen:

- Si `acento` no es un color hex o `actualizacion` está fuera de 1–5, se usa el valor por defecto y queda un aviso en el log (`consumo: ...`) al empezar la sesión.
- En `paneles`, los nombres desconocidos se ignoran con un aviso; si no queda ninguno válido se muestran todos.
- `tema` e `idioma` solo aceptan los valores de la tabla; Claude Code trata cualquier otro como no puesto y aplica el defecto.
- La opción `densidad` de versiones anteriores ya no existe. Si sigue en tu configuración, se ignora sin aviso y el HUD carga igual.
- Si `moneda` no es `EUR` ni `USD`, o `tipoCambio` no es un número mayor que 0, se usa el defecto y queda un aviso en el log.

### Moneda y tipo de cambio

Claude Code da el coste de la sesión en dólares. consumo lo guarda siempre en dólares (también en `datos.js`) y la página lo convierte solo al mostrarlo, una vez por cifra. Con `moneda` = `EUR` (el defecto) cada importe se multiplica por `tipoCambio` y se escribe con el formato de moneda del idioma: en español `1.234,56 €` (el símbolo detrás), en inglés `€1,234.56`. Por debajo de 1 € se ven hasta 4 decimales (`0,1234 €`); desde 1 €, 2 decimales.

`tipoCambio` vale `0.92` por defecto, pero es solo un **valor de referencia**: el plugin no lo consulta en internet y el tipo de cambio real varía cada día. Actualízalo tú cuando quieras que las cifras en euros se acerquen al cambio del momento:

```sh
claude plugin configure consumo@jarvis-essential-pack
echo '{"moneda": "EUR", "tipoCambio": 0.86}' | claude plugin configure consumo@jarvis-essential-pack --values-stdin
```

Para volver a dólares, pon `"moneda": "USD"`. Como el resto de opciones, el HUD aplica el cambio en cuanto `datos.js` lleva la configuración nueva; no hace falta recalcular nada, porque lo guardado sigue en dólares.

Para cambiarlas en un mod instalado:

```
claude plugin configure consumo@jarvis-essential-pack
```

O en una sola línea, por la entrada estándar:

```
echo '{"tema": "stark", "acento": "#ff8a00", "idioma": "en", "actualizacion": 2, "paneles": ["contexto", "coste", "plan"]}' | claude plugin configure consumo@jarvis-essential-pack --values-stdin
```

También aparecen en `/config` dentro de Claude Code. Si cargas el mod con `--plugin-dir`, ponlas en `~/.claude/settings.json`:

```json
{
  "pluginConfigs": {
    "consumo": {
      "options": {
        "tema": "stark",
        "acento": "#ff8a00",
        "idioma": "en",
        "actualizacion": 2,
        "paneles": ["contexto", "coste", "plan"]
      }
    }
  }
}
```

## Qué no hace / límites

- Abrir la ventana solo funciona en Windows: usa `cmd /c start` con Edge o Chrome. En otros sistemas los datos se escriben igual en la carpeta de datos y puedes abrir `index.html` a mano.
- No se ha probado en todos los PC. Puede variar con la versión de Windows, el navegador o el escalado de pantalla.
- Sin navegador no abre la ventana. Los datos se siguen guardando y puedes abrir la página a mano.
- `/jarvis` no puede forzar el cierre: si `window.close()` no funciona en tu Edge, cierra la ventana a mano.
- La comparativa es una estimación, no una factura.
- El coste por turno es aproximado cuando hay varios agentes a la vez.

## Licencia

MIT © deriva1945-ui. Ver [LICENSE](LICENSE).

---

<a id="en"></a>

# consumo (English)

[Español](#es) · **English**

Opens a live HUD window with what the session spends: context, cost and tokens. Seven colour themes (by default `monocromo`: white, greys and black with no accent colour, 3D globe and ring in greys; the others, such as `natural`, are picked with the `tema` option), with the plan bar at the top and a Haiku versus Opus comparison. The `/jarvis` command opens or closes the HUD, and the [Customisation](#en-customisation) options change theme, accent, language, refresh rate, visible panels and currency (euros by default).

![consumo HUD](../images/consumo-1920x1080.jpg)

## What it does

- When the session starts, it opens a separate window with Edge or Chrome in app mode (`--app`).
- At the top, a progress bar for Claude's plan (the tasks it creates and updates), with a collapsible list.
- Context used and its percentage, total cost, and tokens per agent and per model.
- How work is split between models, a tokens-per-turn chart, and the last 20 turns.
- **Haiku versus Opus comparison:** what the session cost and what it would have cost if the work sent to Haiku had gone to Opus, using the cost per token of your own turns. It shows the saving in the HUD currency (euros by default) and %. It needs more than 1000 tokens from each model; otherwise it shows "sin datos de Opus todavía" (no Opus data yet, or Haiku) and estimates nothing.
- **`/jarvis` command:** opens the HUD when it is closed and closes it when it is open.
- It warns when context goes over **70 %** and **85 %**: above 85 % the whole HUD turns alert red.
- After 10 seconds without a new heartbeat **and** 3 reads in a row without one, it shows "Sin señal" (no signal). A single failed read does not trigger it, and the first new heartbeat clears it.
- No flicker: it draws the panels once and then only changes the text and bars that change. If only the heartbeat arrives, it touches nothing.
- It works offline: everything is inside the page.
- Density follows the window size. Below 420 px wide or 900 × 600 px of area it turns compact: it drops the background effects, half of the globe particles, the latest turns and the footer, and tightens the margins. With more room the full HUD comes back. It switches as you resize, without reloading. There is no key or option for it.
- It honours the system setting to reduce motion: the globe and ring stay still, nothing animates and numbers change without sliding. Data is read the same way.
- Accessible: text is at least 14 px, contrast is 4.5:1 or more in the `natural` and `monocromo` themes and focus is visible when moving with the keyboard.

It adapts to the window size (and each panel also adjusts inside to its own width):

| Width | Layout |
|---|---|
| 1600 px or more and 1000 px tall | everything fits without scrolling: plan at the top, three columns, and the chart next to the latest turns at the bottom |
| 1200 px or more | three columns: context, cost and comparison, split and agents |
| 900 to 1199 px | two columns; split by model and agents side by side |
| 560 to 899 px | context on the left, cost and comparison on the right; the rest full width |
| under 560 px | one column; works from 320 px with no horizontal scroll |

| 900 × 600 | 420 × 860 |
|---|---|
| ![900x600](../images/consumo-900x600.png) | ![420x860](../images/consumo-420x860.png) |

| Plan complete | Critical context |
|---|---|
| ![Plan complete](../images/consumo-plan-completo.jpg) | ![Critical context](../images/consumo-critico.jpg) |

| Comparison with Haiku and Opus | Comparison without Opus data |
|---|---|
| ![Comparison available](../images/comparativa-disponible-1920x1080.jpg) | ![Comparison without Opus](../images/comparativa-sin-opus-1920x1080.jpg) |

*Screenshots with sample data.*

## Haiku versus Opus comparison

- **Real (Real):** the sum of the session's turn costs.
- **All on Opus (Todo en Opus):** the real cost, with what Haiku cost replaced by its tokens at the per-token price Opus had in your turns.
- **Saving (Ahorro):** the difference, in the HUD currency and %.
- Below, the tokens and cost of each model (Fable, Haiku, Opus…).
- It is an estimate: cache and the mix of input and output change the real price per token. A turn with no known cost does not count toward the price per token.

## The /jarvis command

![/jarvis in the terminal](../images/jarvis-terminal.png)

`/jarvis` opens or closes the HUD:

- If the HUD is closed, it opens it the same way as at session start (Edge or Chrome with `--app`).
- If it is open, it closes it. The mod does not close the browser window itself, because that would mean killing Edge processes it does not own. Instead it writes `estado.json` in the [data folder](#en-folder) with `{"abierto": false}` (and `{"abierto": true}` before opening). The page reads it every second and, when it sees `abierto: false`, calls `window.close()`.
- If `window.close()` does not close the window, the page shows "HUD cerrado. Escribe /jarvis para abrirlo." (HUD closed. Type /jarvis to open it.) **`window.close()` may not work in every Edge version: in that case close the window by hand.**
- With no browser, `/jarvis` says so and gives you the path of `index.html` so you can open it by hand.

The mod has no `/consumo` command: `/jarvis` is its only command.

## How it works

1. **When the session starts** it registers `/jarvis`, writes the page `index.html` in the data folder and opens it with Edge (or Chrome if Edge is missing).
2. It listens to the **turn ended**, **tool** and **subagent** events (`turn.complete`, `tool.call`, `agent.spawn`).
3. On each turn it adds up input, output and cache tokens per agent and per model, and keeps the last 20 turns. A repeated turn is not counted twice.
4. **Cost** comes from the session's own counter: a turn's cost is how much that counter went up. No price table.
5. Calls to `TaskCreate` and `TaskUpdate` feed the plan bar.
6. Everything is written to `datos.js` (in the data folder) after each turn or tool, and every 3 seconds as a heartbeat.
7. **The page reloads `datos.js` every second** (or every `actualizacion` seconds) and changes only what changed. After 10 seconds without a new heartbeat and 3 reads in a row without one, it shows "Sin señal".
8. The page also loads `estado.js` at the same rate. It is a script copy of `estado.json`, because the browser does not let a page read a `.json` file from `file://`.

Files it creates on your PC, all in the data folder: `index.html` (the page), `datos.js` (the data), `estado.json` and `estado.js` (whether the HUD is open).

## Install

```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install consumo@jarvis-essential-pack
```

Or load it with `--plugin-dir` (see the [main README](../README.md#en-load)).

Requirements: Windows with Edge or Chrome.

<a id="en-folder"></a>

## Data folder

The **`dataDir`** option sets where `index.html`, `datos.js`, `estado.json` and `estado.js` are written.

- **Default:** `~/CLAUDE/consumo`. `~` is your user folder: `%USERPROFILE%` on Windows (for example `C:\Users\<you>\CLAUDE\consumo`), `$HOME` on macOS and Linux.
- It takes an absolute path or one starting with `~`. A relative path counts from your user folder.
- The folder is created if it does not exist.
- If the mod cannot tell your user folder (neither `USERPROFILE` nor `HOME` is set), it uses the `datos` folder inside the plugin itself.

To change it for an installed mod:

```
claude plugin configure consumo@jarvis-essential-pack
```

With no other arguments it shows the options and their values. To save a new value, pass it as JSON on standard input (on Windows use `/`, or double the `\\` inside the JSON):

```
echo '{"dataDir": "~/CLAUDE/consumo"}' | claude plugin configure consumo@jarvis-essential-pack --values-stdin
```

You can also change it inside Claude Code with `/plugin configure consumo@jarvis-essential-pack` or in `/config`. If you load the mod with `--plugin-dir`, save the value in `~/.claude/settings.json`:

```json
{ "pluginConfigs": { "consumo": { "options": { "dataDir": "~/CLAUDE/consumo" } } } }
```

The change applies when you restart Claude Code.

<a id="en-customisation"></a>

## Customisation

Besides `dataDir`, the HUD has these options. All of them go into `datos.js` under the `config` field (already validated), and the page applies them when it reads it.

| Option | Values | Default | What it changes |
| --- | --- | --- | --- |
| `tema` | `monocromo` (black and white), `natural`, `mark-ii`, `mark-l`, `stark`, `hibrido` (hybrid), `claro` (light) | `monocromo` | HUD colour theme (the page's `data-tema` attribute). |
| `acento` | hex colour: `#rgb` or `#rrggbb` | `#7fe7ff` | Accent colour. With the default each theme keeps its own accent; any other value replaces it. |
| `idioma` | `es`, `en` | `es` | Language of the HUD labels, time and numbers. Agent, model and task names are not translated. |
| `actualizacion` | number of seconds, 1 to 5 | `1` | How often the page re-reads `datos.js`. |
| `paneles` | list of `contexto`, `coste`, `reparto` (split), `agentes` (agents), `historial` (history), `grafica` (chart), `comparativa` (comparison), `plan` | all | Visible panels. If you hide some, the rest move up with no gaps (in the HUD's own order). |
| `moneda` | `EUR`, `USD` | `EUR` | Currency for every cost on the HUD (Cost panel, last turn, comparison, chart and tables). With `USD` you see the dollars exactly as Claude Code reports them, unconverted. |
| `tipoCambio` | number above 0: euros per 1 dollar | `0.92` | Exchange rate to euros: cost in € = cost in $ × `tipoCambio` (with `0.92`, 1 USD is €0.92). Only used when `moneda` is `EUR`. |

The themes:

- `monocromo` (default): white, greys and black only, with no accent colour at all (the `acento` option is not applied). Opaque panels with no glow; the 3D globe, ring and core stay, in greys. All text reaches 4.5:1 contrast or more. The high warning gets a dashed border; the critical one is inverted (black on white), with a double border and a lighter context panel.
- `natural`: warm graphite, ivory text and a single sage accent; no glow, glass, grid or scan line. A summary band at the top holds context (3D globe, ring and core), cost and the comparison; the detail sits below. Table figures in monospace.
- `hibrido`: white-cyan on blue-black, with an amber ring around the globe.
- `mark-ii`: electric cyan on deep blue-black, brighter glow.
- `mark-l`: white and light blue, lighter glass panels.
- `stark`: amber and gold on charcoal.
- `claro`: light background with blue accents, for daytime work.

Red is kept for alerts in every other theme. In small windows (compact density) glows, blur and the animated background are turned off.

Invalid values:

- If `acento` is not a hex colour or `actualizacion` is outside 1–5, the default is used and a warning (`consumo: ...`) is logged when the session starts.
- In `paneles`, unknown names are ignored with a warning; if none is valid, every panel is shown.
- `tema` and `idioma` only take the values in the table; Claude Code treats any other value as unset and applies the default.
- The `densidad` option from earlier versions is gone. If it is still in your settings it is ignored without a warning and the HUD loads as usual.
- If `moneda` is not `EUR` or `USD`, or `tipoCambio` is not a number above 0, the default is used and a warning is logged.

### Currency and exchange rate

Claude Code reports the session cost in dollars. consumo always stores it in dollars (also in `datos.js`) and the page converts it only when showing it, once per figure. With `moneda` set to `EUR` (the default) every amount is multiplied by `tipoCambio` and written in the currency format of the HUD language: in Spanish `1.234,56 €` (symbol after the number), in English `€1,234.56`. Below €1 you see up to 4 decimals (`€0.1234`); from €1 up, 2 decimals.

`tipoCambio` defaults to `0.92`, but it is only a **reference value**: the plugin does not look it up online and the real exchange rate changes every day. Update it yourself whenever you want the euro figures to match the current rate:

```sh
claude plugin configure consumo@jarvis-essential-pack
echo '{"moneda": "EUR", "tipoCambio": 0.86}' | claude plugin configure consumo@jarvis-essential-pack --values-stdin
```

To go back to dollars, set `"moneda": "USD"`. Like the other options, the HUD applies it as soon as `datos.js` carries the new config; nothing is recalculated, because the stored figures stay in dollars.

To change them in an installed mod:

```
claude plugin configure consumo@jarvis-essential-pack
```

Or in one line, through standard input:

```
echo '{"tema": "stark", "acento": "#ff8a00", "idioma": "en", "actualizacion": 2, "paneles": ["contexto", "coste", "plan"]}' | claude plugin configure consumo@jarvis-essential-pack --values-stdin
```

They also show up in `/config` inside Claude Code. If you load the mod with `--plugin-dir`, put them in `~/.claude/settings.json`:

```json
{
  "pluginConfigs": {
    "consumo": {
      "options": {
        "tema": "stark",
        "acento": "#ff8a00",
        "idioma": "en",
        "actualizacion": 2,
        "paneles": ["contexto", "coste", "plan"]
      }
    }
  }
}
```

## What it does not do / limits

- Opening the window only works on Windows: it uses `cmd /c start` with Edge or Chrome. On other systems the data is still written to the data folder and you can open `index.html` by hand.
- It has not been tested on every PC. It may vary with the Windows version, the browser or display scaling.
- With no browser, it does not open the window. Data is still saved and you can open the page by hand.
- `/jarvis` cannot force the window shut: if `window.close()` does not work in your Edge, close the window by hand.
- The comparison is an estimate, not a bill.
- Cost per turn is approximate when several agents run at once.

## License

MIT © deriva1945-ui. See [LICENSE](LICENSE).
