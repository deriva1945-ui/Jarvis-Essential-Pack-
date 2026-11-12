<a id="es"></a>

# portero

**Español** · [English](#en)

Mira cada petición antes de responder y decide quién la hace: el modelo de la sesión o un subagente potente. Clasifica por capas, guarda cada decisión en un registro local y te enseña con `/portero` cómo está repartiendo.

![Cómo reparte portero](../images/portero-diagrama.png)

## Qué hace

| Ruta | Ejemplos | Quién responde |
|---|---|---|
| **Ligera** | traducir, dar formato, preguntas cortas, "gracias" | el modelo de la sesión, sin subagentes |
| **Pesada** | arquitectura, depurar, analizar, código, varios archivos | un subagente con el modelo pesado (`opus` o `fable`), con contexto reciente |
| **Dudosa** | lo que no está claro | la ruta pesada, con el doble de contexto y la petición de valorar el alcance primero |

## Cómo funciona: capas

Cada mensaje enviado (`prompt.submit`) pasa por estas capas, en orden. La primera que decide, gana. Los comandos (`/...`) y los mensajes vacíos pasan sin tocar.

1. **Override.** `!pesada`, `!ligera` o `!dudosa` al principio deciden sin consultar nada. El atajo se quita del texto antes de que llegue al modelo.
2. **Longitud** (`ruleLength`). Más de `heavyLength` caracteres (600 por defecto) → pesada.
3. **Bloques de código** (`ruleCode`). Un bloque ```` ``` ````, código sangrado o una traza de error → pesada.
4. **Rutas de archivo** (`rulePaths`). Nombra un archivo de código (`src/app.ts`, `main.py`, `config.yaml`…) → pesada.
5. **Palabras clave pesadas** (`ruleKeywords`). Grupos `diseno`, `depuracion`, `analisis`, `implementacion`, `multiarchivo` ("refactor", "depura", "analiza", "implementa", "varios archivos"…) → pesada.
6. **Historial reciente** (`ruleHistory`). Si la petición anterior fue pesada o dudosa y esta es corta (menos de `lightLength` caracteres) y es un seguimiento ("y ahora…", "sigue", "hazlo", "eso"…), o el último turno del asistente usó 3 o más herramientas, sigue en pesada.
7. **Palabras clave ligeras** (`ruleKeywords`). Si es corta y empieza por "traduce", "formatea", "qué es", "cuánto"… o es una confirmación ("gracias", "ok") → ligera.
8. **Modelo ligero.** Solo si ninguna regla decide, pregunta a `classifierModel` (Haiku por defecto): ligera, pesada o dudosa. Se le dice la ruta de la petición anterior.
9. **Degradación.** Si el clasificador falla, la ruta es pesada y el registro guarda un aviso.

Después:

- **Ligera:** añade una nota al turno ("respuesta breve, sin subagentes").
- **Pesada o dudosa:** añade una nota que pide delegar la tarea con la herramienta Agent y el contexto reciente. Cuando nace ese subagente (`agent.spawn`), portero le pone el modelo pesado si nadie eligió otro.
- La línea de estado muestra la ruta y el motivo: `portero: pesada (palabra-pesada:depuracion) → opus`.

### Contexto para el subagente

Solo se pasan los mensajes que hacen falta: los más recientes, hasta `contextMessages` mensajes y `contextChars` caracteres en total (el doble con dudosa). Se saltan los mensajes vacíos (turnos que solo usaron herramientas), las confirmaciones ("ok", "gracias") y el propio mensaje actual. Con `contextMessages` a 0 no se pasa nada. La ruta ligera no lleva contexto extra.

## Overrides

- `!pesada ...` fuerza la ruta pesada.
- `!ligera ...` fuerza la ruta ligera.
- `!dudosa ...` va por la ruta pesada con el doble de contexto y pide al subagente que valore el alcance antes de actuar.

## Configuración

Opciones de `userConfig`. Se cambian con `claude plugin configure portero@jarvis-essential-pack`, con `/config` o, con `--plugin-dir`, en `pluginConfigs` de `settings.json`.

| Opción | Por defecto | Qué hace |
|---|---|---|
| `heavyModel` | `opus` | Modelo del subagente pesado: `opus` o `fable`. |
| `classifierModel` | `haiku` | Modelo ligero que decide los casos dudosos. |
| `heavyLength` | `600` | Más caracteres que esto → pesada. |
| `lightLength` | `200` | Las reglas ligeras y de historial solo valen por debajo de esto. |
| `ruleLength`, `ruleCode`, `rulePaths`, `ruleKeywords`, `ruleHistory` | `true` | Activan o desactivan cada regla. Una regla desactivada deja el caso a la siguiente capa. |
| `contextMessages` | `4` | Mensajes recientes para el subagente (0 = ninguno). |
| `contextChars` | `4000` | Máximo de caracteres de contexto. |
| `dataDir` | `~/CLAUDE/portero` | Carpeta del registro. `~` es tu carpeta de usuario (`USERPROFILE` en Windows, `HOME` en macOS y Linux). |
| `logEnabled` | `true` | Guarda o no las decisiones. |
| `logMaxEntries` | `2000` | Se conservan las últimas N decisiones. |
| `logTextChars` | `120` | Caracteres de cada petición que se guardan (0 = ninguno). |

## Registro de decisiones

Cada decisión se añade a `decisiones.jsonl` dentro de `dataDir`, una línea JSON por petición:

```json
{"ts":"2026-11-12T10:15:02.120Z","ruta":"pesada","capa":"regla","motivo":"palabra-pesada:depuracion","texto":"depura el login, se cuelga","longitud":26}
```

- `capa`: `override`, `regla`, `historial`, `modelo` o `fallo`. `motivo`: la regla concreta (`longitud`, `codigo`, `ruta-archivo`, `palabra-pesada:<grupo>`, `palabra-ligera:<grupo>`, `historial:seguimiento`, `modelo:<etiqueta>`, `fallo-clasificador`…).
- `aviso`: solo cuando el clasificador falló.
- El texto va en una línea, recortado a `logTextChars` y con secretos evidentes tapados (claves `sk-…`, tokens de GitHub, JWT, `password=…`, correos, cadenas hexadecimales largas).
- El archivo solo se escribe en tu equipo. portero no lo envía a ningún sitio. Sirve para revisar qué reglas aciertan y ajustar umbrales.

## Comandos

- **`/portero`**: reparto de rutas (cuántas ligeras, pesadas y dudosas, con %), reparto por capa, reglas que más disparan, avisos del clasificador y los últimos casos.
- **`/portero reglas`**: las reglas activas y desactivadas, los umbrales, el modelo pesado, los límites de contexto y dónde está el registro.

## Cómo se instala

```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install portero@jarvis-essential-pack
```

O cárgalo con `--plugin-dir` (ver el [README principal](../README.md#es-cargar)).

## Qué no hace / límites

- No cambia el modelo del hilo principal. Si la sesión usa Opus, lo ligero también va con Opus. Para ahorrar, pon la sesión en Haiku con `/model`.
- El subagente solo ve el contexto reciente que dejan `contextMessages` y `contextChars`, no todo el historial.
- La clasificación puede fallar. Si no estás de acuerdo, usa los overrides y revisa `/portero` para ajustar reglas y umbrales.
- Cada petición que las reglas no deciden cuesta una consulta corta al modelo clasificador (que sí recibe el texto de la petición, como cualquier mensaje a Claude).

## Licencia

MIT © deriva1945-ui. Ver [LICENSE](LICENSE).

---

<a id="en"></a>

# portero (English)

[Español](#es) · **English**

Looks at each request before answering and decides who handles it: the session model or a powerful subagent. It classifies in layers, keeps every decision in a local log and shows you with `/portero` how it is routing.

![How portero routes work](../images/portero-diagrama.png)

## What it does

| Route | Examples | Who answers |
|---|---|---|
| **Light** (`ligera`) | translate, format, short questions, "thanks" | the session model, with no subagents |
| **Heavy** (`pesada`) | architecture, debugging, analysis, code, several files | a subagent on the heavy model (`opus` or `fable`), with recent context |
| **Unsure** (`dudosa`) | anything unclear | the heavy route, with twice the context and a request to assess the scope first |

## How it works: layers

Every sent message (`prompt.submit`) goes through these layers, in order. The first one that decides wins. Commands (`/...`) and empty messages pass through untouched.

1. **Override.** `!pesada`, `!ligera` or `!dudosa` at the start decide without asking anything. The shortcut is removed from the text before it reaches the model.
2. **Length** (`ruleLength`). Over `heavyLength` characters (600 by default) → heavy.
3. **Code blocks** (`ruleCode`). A ```` ``` ```` block, indented code or an error trace → heavy.
4. **File paths** (`rulePaths`). Names a code file (`src/app.ts`, `main.py`, `config.yaml`…) → heavy.
5. **Heavy keywords** (`ruleKeywords`). Groups `diseno`, `depuracion`, `analisis`, `implementacion`, `multiarchivo` ("refactor", "debug", "analiza", "implementa", "varios archivos"…) → heavy.
6. **Recent history** (`ruleHistory`). If the previous request was heavy or unsure and this one is short (under `lightLength` characters) and a follow-up ("y ahora…", "sigue", "hazlo", "eso"…), or the assistant's last turn used 3 or more tools, it stays heavy.
7. **Light keywords** (`ruleKeywords`). If it is short and starts with "traduce", "translate", "formatea", "qué es", "what is"… or is an acknowledgement ("gracias", "ok") → light.
8. **Light model.** Only when no rule decides, it asks `classifierModel` (Haiku by default): light, heavy or unsure. It is told the previous request's route.
9. **Degradation.** If the classifier fails, the route is heavy and the log keeps a warning.

Then:

- **Light:** it adds a note to the turn ("short answer, no subagents").
- **Heavy or unsure:** it adds a note asking to delegate the task with the Agent tool, plus the recent context. When that subagent starts (`agent.spawn`), portero gives it the heavy model if no one chose another.
- The status line shows the route and the reason: `portero: pesada (palabra-pesada:depuracion) → opus`.

### Context for the subagent

Only the messages that are needed are passed: the most recent ones, up to `contextMessages` messages and `contextChars` characters in total (twice that when unsure). Empty messages (turns that only used tools), acknowledgements ("ok", "thanks") and the current message itself are skipped. With `contextMessages` at 0 nothing is passed. The light route carries no extra context.

## Overrides

- `!pesada ...` forces the heavy route.
- `!ligera ...` forces the light route.
- `!dudosa ...` takes the heavy route with twice the context and asks the subagent to assess the scope before acting.

## Configuration

`userConfig` options. Change them with `claude plugin configure portero@jarvis-essential-pack`, with `/config` or, with `--plugin-dir`, under `pluginConfigs` in `settings.json`.

| Option | Default | What it does |
|---|---|---|
| `heavyModel` | `opus` | Model of the heavy subagent: `opus` or `fable`. |
| `classifierModel` | `haiku` | Light model that decides the unclear cases. |
| `heavyLength` | `600` | More characters than this → heavy. |
| `lightLength` | `200` | Light and history rules only apply below this. |
| `ruleLength`, `ruleCode`, `rulePaths`, `ruleKeywords`, `ruleHistory` | `true` | Turn each rule on or off. A rule that is off leaves the case to the next layer. |
| `contextMessages` | `4` | Recent messages for the subagent (0 = none). |
| `contextChars` | `4000` | Maximum context characters. |
| `dataDir` | `~/CLAUDE/portero` | Log folder. `~` is your user folder (`USERPROFILE` on Windows, `HOME` on macOS and Linux). |
| `logEnabled` | `true` | Whether decisions are logged. |
| `logMaxEntries` | `2000` | The last N decisions are kept. |
| `logTextChars` | `120` | Characters of each request that are kept (0 = none). |

## Decision log

Each decision is appended to `decisiones.jsonl` inside `dataDir`, one JSON line per request:

```json
{"ts":"2026-11-12T10:15:02.120Z","ruta":"pesada","capa":"regla","motivo":"palabra-pesada:depuracion","texto":"depura el login, se cuelga","longitud":26}
```

- `capa` (layer): `override`, `regla`, `historial`, `modelo` or `fallo`. `motivo` (reason): the exact rule (`longitud`, `codigo`, `ruta-archivo`, `palabra-pesada:<group>`, `palabra-ligera:<group>`, `historial:seguimiento`, `modelo:<label>`, `fallo-clasificador`…).
- `aviso` (warning): only when the classifier failed.
- The text is one line, cut to `logTextChars`, with obvious secrets masked (`sk-…` keys, GitHub tokens, JWTs, `password=…`, emails, long hex strings).
- The file is only written on your machine. portero sends it nowhere. Use it to see which rules get it right and tune thresholds.

## Commands

- **`/portero`**: route split (how many light, heavy and unsure, with %), split by layer, the rules that fire most, classifier warnings and the latest cases.
- **`/portero reglas`**: active and inactive rules, thresholds, heavy model, context limits and where the log is.

## Install

```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install portero@jarvis-essential-pack
```

Or load it with `--plugin-dir` (see the [main README](../README.md#en-load)).

## What it does not do / limits

- It does not change the main thread's model. If the session runs on Opus, light work also runs on Opus. To save, switch the session to Haiku with `/model`.
- The subagent only sees the recent context that `contextMessages` and `contextChars` allow, not the full history.
- The classification can be wrong. If you disagree, use the overrides and check `/portero` to tune rules and thresholds.
- Each request the rules cannot decide costs one short call to the classifier model (which does receive the request text, like any message to Claude).

## License

MIT © deriva1945-ui. See [LICENSE](LICENSE).
