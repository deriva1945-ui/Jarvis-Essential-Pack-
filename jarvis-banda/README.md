<a id="es"></a>

# jarvis-banda

**Español** · [English](#en)

Dibuja una línea estilo J.A.R.V.I.S. encima del prompt con el estado en vivo de la sesión, el modelo activo y el contexto usado.

```
◑ J.A.R.V.I.S. // EJECUTANDO Bash · OPUS-5.5 · CTX 42%
```

![jarvis-banda delegando](../images/banda-delegando.png)

*Aproximación en HTML de la versión 0.2.0, no es la salida real de la terminal.*

## Qué muestra

Una sola línea, siempre. Cada estado tiene su símbolo de una columna:

| Símbolo | Estado | Cuándo |
|---|---|---|
| ◌ | ESPERANDO ÓRDENES | al empezar la sesión y al terminar cada turno |
| ◐ | PROCESANDO | al enviar un mensaje, y al terminar una herramienta, un subagente o el razonamiento |
| ◓ | PENSANDO | mientras llega texto de razonamiento visible del modelo |
| ◑ | EJECUTANDO herramienta | mientras corre una herramienta (`Bash`, `Edit`…; las de MCP como `servidor/herramienta`) |
| ◒ | DELEGANDO → tipo (modelo) | mientras trabaja un subagente, con su tipo y su modelo |
| ◈ | ESPERANDO PERMISO · herramienta | cuando Claude Code va a pedir permiso para una herramienta |
| ✕ | ERROR EN herramienta | cuando una herramienta termina con error, hasta el siguiente cambio |

Detrás del estado, en la misma línea: el modelo activo (`OPUS-5.5`) y el contexto usado (`CTX 42%`). El contexto aparece cuando Claude Code ya lo ha medido (tras la primera respuesta).

### Colores

La banda es monocroma, como el HUD de consumo: blanco y grises, sin color de acento. El tono de la línea depende del modelo:

| Modelo | Tono por defecto |
|---|---|
| Haiku | gris medio `#a3a3a3` |
| Opus | blanco `#ffffff` |
| Fable | gris medio `#a3a3a3` |
| Otros | gris claro `#d4d4d4` |

Al delegar, la línea toma el tono del modelo del subagente. El estado de error es lo único con color: rojo apagado (`#b85c5c`). Los cuatro tonos se pueden cambiar por cualquier color con las opciones de abajo.

### Pulso

En cada cambio de estado, el símbolo se dibuja invertido unos 600 ms y vuelve a la normalidad. Es la única animación posible: la banda no admite CSS ni redibujos continuos, así que el pulso es un redibujo más que lanza un temporizador. Se apaga con `animacion: false`.

## Configuración

Con `claude plugin configure jarvis-banda@jarvis-essential-pack`, con `/config` o, con `--plugin-dir`, en `pluginConfigs` de `settings.json`:

| Opción | Valores | Por defecto | Qué hace |
|---|---|---|---|
| `idioma` | `es`, `en` | `es` | idioma de los textos |
| `modo` | `completo`, `compacto`, `oculto` | `completo` | `completo`: J.A.R.V.I.S., estado, modelo y contexto. `compacto`: solo símbolo y estado. `oculto`: sin banda |
| `mostrarModelo` | `true`, `false` | `true` | modelo activo al final de la línea |
| `mostrarContexto` | `true`, `false` | `true` | porcentaje de contexto al final de la línea |
| `animacion` | `true`, `false` | `true` | pulso al cambiar de estado |
| `colorHaiku`, `colorOpus`, `colorFable`, `colorOtro` | `#rrggbb`, `#rgb` o un nombre (`magenta`) | ver la tabla de colores | color de cada familia de modelos |

Un color que no sea válido vuelve a su valor por defecto.

Ejemplo en `settings.json`:

```json
{
  "pluginConfigs": {
    "jarvis-banda": {
      "options": { "idioma": "en", "colorOpus": "#ff8800", "mostrarContexto": false }
    }
  }
}
```

## Comando /banda

Cambia el idioma o el modo **solo en esta sesión**, sin tocar la configuración:

| Comando | Efecto |
|---|---|
| `/banda es` · `/banda en` | idioma |
| `/banda completo` · `/banda compacto` · `/banda oculto` | modo |
| `/banda reset` | vuelve a lo que diga la configuración |
| `/banda` | dice el idioma y el modo actuales |

Funciona también mientras Claude está trabajando.

## Cómo funciona

1. Guarda un estado pequeño (`$.state`): fase, herramienta, subagente y su modelo, modelo de la sesión, contexto y pulso.
2. Cada evento cambia la fase:
   - `session.start` y fin de turno → esperando.
   - `prompt.submit` → procesando.
   - `turn.step` (fragmentos de razonamiento con texto) → pensando; al llegar texto o una herramienta, procesando.
   - `tool.call` → ejecutando mientras corre; al acabar, procesando, o error si la herramienta falló.
   - `tool.check` con decisión `ask` → esperando permiso.
   - `agent.spawn` → delegando; fin del subagente → procesando.
   - `session.measure` y fin de turno → contexto.
3. Las herramientas de los subagentes no cambian la línea (manda la delegación), salvo un permiso que pidan.
4. Al dibujar la zona de **encima del prompt** (`ui.render`, `AbovePrompt`) pinta una línea con símbolo, texto y color, recortada si no cabe.

## Cómo se instala

```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install jarvis-banda@jarvis-essential-pack
```

O cárgalo con `--plugin-dir` (ver el [README principal](../README.md#es-cargar)).

## Límites

- **Permiso:** la línea pasa a «esperando permiso» cuando Claude Code decide preguntar, y vuelve a procesando cuando la herramienta termina. Mientras la herramienta aprobada se ejecuta sigue diciendo «esperando permiso»: no hay evento entre tu respuesta y el inicio de la herramienta.
- **Pensando** solo aparece si el razonamiento llega como texto visible; con el razonamiento oculto o resumido sin texto, la línea se queda en procesando.
- **Error** se queda hasta el siguiente cambio de estado (otra herramienta, razonamiento o fin de turno).
- **Pulso:** no hay transiciones CSS ni parpadeo continuo en la banda; es un redibujo con el símbolo invertido. En escritorio se ve como un fondo breve en el símbolo.
- **Contexto:** sin medida (sesión nueva o recién compactada) el segmento no aparece.
- No se ha probado en todas las terminales de Windows.
- No muestra coste: eso está en el mod [consumo](../consumo/). No toca la línea de estado ni muestra avisos.
- Si algo falla al leer el estado, la línea desaparece y el prompt sigue normal.

## Cambios

- **0.3.0:** estados pensando, esperando permiso y error; modelo y contexto en la misma línea; pulso al cambiar; `userConfig` (idioma, modo, colores, modelo, contexto, animación); comando `/banda`; textos en inglés.
- **0.2.0:** una sola línea con esperando, procesando, ejecutando y delegando.

## Licencia

MIT © deriva1945-ui. Ver [LICENSE](LICENSE).

---

<a id="en"></a>

# jarvis-banda (English)

[Español](#es) · **English**

Draws one J.A.R.V.I.S.-style line above the prompt with the session's live state, the active model and the context used.

```
◑ J.A.R.V.I.S. // RUNNING Bash · OPUS-5.5 · CTX 42%
```

![jarvis-banda delegating](../images/banda-delegando.png)

*HTML approximation of version 0.2.0, not the real terminal output.*

## What it shows

Always one line. Each state has its own one-column symbol (labels shown with `idioma: en`):

| Symbol | State | When |
|---|---|---|
| ◌ | AWAITING ORDERS | when the session starts and after each turn |
| ◐ | PROCESSING | when you send a message, and after a tool, a subagent or the reasoning ends |
| ◓ | THINKING | while visible reasoning text arrives from the model |
| ◑ | RUNNING tool | while a tool runs (`Bash`, `Edit`…; MCP tools as `server/tool`) |
| ◒ | DELEGATING → type (model) | while a subagent works, with its type and model |
| ◈ | AWAITING PERMISSION · tool | when Claude Code is about to ask permission for a tool |
| ✕ | ERROR IN tool | when a tool ends with an error, until the next change |

After the state, on the same line: the active model (`OPUS-5.5`) and the context used (`CTX 42%`). The context appears once Claude Code has measured it (after the first response).

### Colors

The band is monochrome, like the usage HUD: white and greys, no accent color. The line's tone depends on the model:

| Model | Default tone |
|---|---|
| Haiku | mid grey `#a3a3a3` |
| Opus | white `#ffffff` |
| Fable | mid grey `#a3a3a3` |
| Others | light grey `#d4d4d4` |

While delegating, the line uses the subagent's model tone. The error state is the only one in color: muted red (`#b85c5c`). All four tones can be changed to any color with the options below.

### Pulse

On every state change the symbol is drawn inverted for about 600 ms and then goes back to normal. It is the only animation available: the band takes no CSS and no continuous redraws, so the pulse is one more redraw started by a timer. Turn it off with `animacion: false`.

## Configuration

With `claude plugin configure jarvis-banda@jarvis-essential-pack`, with `/config` or, with `--plugin-dir`, under `pluginConfigs` in `settings.json`:

| Option | Values | Default | What it does |
|---|---|---|---|
| `idioma` | `es`, `en` | `es` | language of the labels |
| `modo` | `completo`, `compacto`, `oculto` | `completo` | `completo` (full): J.A.R.V.I.S., state, model and context. `compacto` (compact): symbol and state only. `oculto` (hidden): no band |
| `mostrarModelo` | `true`, `false` | `true` | active model at the end of the line |
| `mostrarContexto` | `true`, `false` | `true` | context percentage at the end of the line |
| `animacion` | `true`, `false` | `true` | pulse on state change |
| `colorHaiku`, `colorOpus`, `colorFable`, `colorOtro` | `#rrggbb`, `#rgb` or a name (`magenta`) | see the colors table | color of each model family |

An invalid color falls back to its default.

Example in `settings.json`:

```json
{
  "pluginConfigs": {
    "jarvis-banda": {
      "options": { "idioma": "en", "colorOpus": "#ff8800", "mostrarContexto": false }
    }
  }
}
```

## /banda command

Changes the language or the mode **for this session only**, without touching the configuration:

| Command | Effect |
|---|---|
| `/banda es` · `/banda en` | language |
| `/banda completo` · `/banda compacto` · `/banda oculto` | mode |
| `/banda reset` | back to what the configuration says |
| `/banda` | tells the current language and mode |

It also works while Claude is working.

## How it works

1. It keeps a small state (`$.state`): phase, tool, subagent and its model, session model, context and pulse.
2. Each event changes the phase:
   - `session.start` and end of turn → waiting.
   - `prompt.submit` → processing.
   - `turn.step` (reasoning pieces with text) → thinking; when text or a tool arrives, processing.
   - `tool.call` → running while it runs; when it ends, processing, or error if the tool failed.
   - `tool.check` with an `ask` decision → awaiting permission.
   - `agent.spawn` → delegating; subagent end → processing.
   - `session.measure` and end of turn → context.
3. Subagents' tools do not change the line (delegation wins), except for a permission they ask for.
4. When the area **above the prompt** is drawn (`ui.render`, `AbovePrompt`) it paints one line with symbol, text and color, truncated if it does not fit.

## Install

```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install jarvis-banda@jarvis-essential-pack
```

Or load it with `--plugin-dir` (see the [main README](../README.md#en-load)).

## Limits

- **Permission:** the line switches to "awaiting permission" when Claude Code decides to ask, and goes back to processing when the tool ends. While the approved tool runs it still says "awaiting permission": there is no event between your answer and the tool's start.
- **Thinking** only shows when reasoning arrives as visible text; with hidden reasoning, or a summary with no text, the line stays on processing.
- **Error** stays until the next state change (another tool, reasoning or end of turn).
- **Pulse:** the band has no CSS transitions or continuous blinking; it is a redraw with the symbol inverted. On desktop it shows as a brief background on the symbol.
- **Context:** with no measurement (new or just-compacted session) the segment does not show.
- It has not been tested in every Windows terminal.
- It does not show cost: that is the [consumo](../consumo/) mod. It does not touch the status line or show notices.
- If reading the state fails, the line disappears and the prompt works as usual.

## Changes

- **0.3.0:** thinking, awaiting-permission and error states; model and context on the same line; pulse on change; `userConfig` (language, mode, colors, model, context, animation); `/banda` command; English labels.
- **0.2.0:** one line with waiting, processing, running and delegating.

## License

MIT © deriva1945-ui. See [LICENSE](LICENSE).
