<a id="es"></a>

# resumen-sesion

**Español** · [English](#en)

Resumen de traspaso de tu sesión, para retomarla en una sesión nueva sin arrastrar todo el historial.

![Ejemplo de resumen-sesion](../images/resumen-terminal.png)

*Ejemplo en HTML, no es una captura real.*

## Qué hace

- Genera un **resumen de traspaso en secciones fijas**:
  1. **Objetivo**
  2. **Decisiones tomadas**
  3. **Archivos tocados** (rutas únicas; se puede desactivar)
  4. **Comandos ejecutados** (los relevantes)
  5. **Errores vistos**
  6. **Pendientes**
- Se genera de dos formas: **automática** al volver tras un rato sin escribir, o **bajo demanda** con `/resumen`.
- **Guarda el último resumen** en un archivo con su fecha, para recuperarlo aunque cierres la sesión (`/resumen-ver`).
- Te **sugiere empezar una sesión nueva** y te deja el texto listo para copiar y pegar.

¿Por qué una sesión nueva? En cada turno se vuelve a procesar todo el historial. Empezar de cero con el resumen gasta menos tokens.

## Cómo funciona

1. El mod recoge los **últimos 30 mensajes** (recortados) y los **datos de las herramientas** de la sesión:
   - archivos escritos o editados con éxito (`Edit`, `Write`, `MultiEdit`, `NotebookEdit`), sin repetir; los que solo se leyeron no cuentan;
   - comandos de `Bash` o `PowerShell`, sin los de solo consulta (`ls`, `cd`, `pwd`, `cat`...); los 15 últimos;
   - herramientas que terminaron en error, con la primera línea del mensaje; los 10 últimos.
2. Pide al **modelo ligero** (`haiku`) las secciones de texto: objetivo, decisiones y pendientes, con el límite de tokens que configures.
3. Monta el resumen: las secciones del modelo más las de archivos, comandos y errores, que salen de los datos reales (el modelo no las inventa).
4. Lo guarda en el archivo y te muestra la sugerencia de sesión nueva.

### Los dos disparadores

- **Automático.** Al terminar cada turno guarda la hora. Cuando envías un mensaje, si han pasado **2 horas o más** (configurable) desde el último turno, genera el resumen, lo añade al contexto de ese mensaje, muestra un aviso breve y deja en el registro de la sesión el texto listo para copiar.
  - **Limitación:** solo se activa **al volver a escribir**. Un mod no se ejecuta mientras la sesión está parada, así que no hay resumen "a las 2 horas" si no escribes nada. Tampoco se activa con el primer mensaje de la sesión ni con comandos (`/algo`).
- **Bajo demanda.** `/resumen` lo genera en el momento, sin esperar a ningún umbral.

### Si falla el modelo

- No se pierde nada: el **último resumen guardado no se sobrescribe** y sigue disponible con `/resumen-ver`.
- Se avisa con el motivo (error de la API, respuesta vacía, tiempo agotado...).
- Recibes un **resumen parcial** con los datos de herramientas (archivos, comandos, errores); el objetivo, las decisiones y los pendientes salen como "no disponible".
- En el disparador automático, el mod **lo reintenta una vez** en tu siguiente mensaje. Si vuelve a fallar, deja de insistir; usa `/resumen` cuando quieras.
- Si no se puede escribir el archivo, el resumen se muestra igual y `/resumen-ver` usa la copia guardada en la sesión.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `/resumen` | Genera ahora el resumen, lo guarda y te da la sugerencia con el texto para copiar. |
| `/resumen-ver` | Muestra el último resumen guardado (con su fecha), listo para copiar. No llama al modelo. |

La salida de los comandos queda en la conversación, así que el modelo también la lee.

Se dibuja en monocromo, como el HUD de consumo: la primera línea y la cabecera del resumen en blanco, cada sección con su título en blanco y un separador gris encima, y el resto en grises. Sin colores de acento.

## Configuración

Opciones de `userConfig`. Se cambian con `claude plugin configure resumen-sesion@jarvis-essential-pack`, con `/config` o, con `--plugin-dir`, en `pluginConfigs` de `settings.json`:

| Opción | Qué es | Por defecto |
| --- | --- | --- |
| `idleHours` | Horas sin actividad para el disparador automático. Admite decimales (`0.5` = media hora). | `2` |
| `maxTokens` | Límite de tokens de la respuesta del modelo (entre 200 y 8000). | `800` |
| `includeFiles` | Incluir la sección de archivos tocados. | `true` |
| `language` | Idioma del resumen y de los avisos: `es` o `en`. | `es` |
| `dataDir` | Carpeta donde se guarda el resumen. Ruta absoluta o con `~` (tu carpeta de usuario). | `~/CLAUDE/resumen-sesion` |

Ejemplo en `settings.json`:

```json
{
  "pluginConfigs": {
    "resumen-sesion": { "options": { "idleHours": 1.5, "maxTokens": 1200, "language": "en" } }
  }
}
```

## Dónde se guarda el resumen

En **`<dataDir>/ultimo-resumen.md`**; por defecto `~/CLAUDE/resumen-sesion/ultimo-resumen.md`. `~` es `USERPROFILE` en Windows y `HOME` en macOS y Linux; si no se conoce, se usa la carpeta `datos` del propio plugin.

El archivo empieza con la fecha y el origen (automático o `/resumen`). Cada resumen nuevo **sustituye** al anterior; si el modelo falla, el anterior se queda.

## Cómo se instala

```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install resumen-sesion@jarvis-essential-pack
```

O cárgalo con `--plugin-dir` (ver el [README principal](../README.md#es-cargar)).

## Qué no hace / límites

- No actúa mientras la sesión está parada: el automático solo salta cuando vuelves a escribir.
- No abre la sesión nueva por ti: eso lo haces tú, pegando el texto.
- Resume los últimos 30 mensajes; los datos de herramientas cubren toda la sesión.
- Guarda solo el último resumen, no un historial.

## Licencia

MIT © deriva1945-ui. Ver [LICENSE](LICENSE).

---

<a id="en"></a>

# resumen-sesion (English)

[Español](#es) · **English**

A handover summary of your session, so you can pick it up in a new session without dragging the whole history along.

![resumen-sesion example](../images/resumen-terminal.png)

*HTML example, not a real screenshot.*

## What it does

- Writes a **handover summary in fixed sections**:
  1. **Goal**
  2. **Decisions made**
  3. **Files touched** (unique paths; can be turned off)
  4. **Commands run** (the relevant ones)
  5. **Errors seen**
  6. **Pending**
- Two ways to get one: **automatic** when you come back after a break, or **on demand** with `/resumen`.
- **Saves the last summary** to a dated file, so you can get it back even after closing the session (`/resumen-ver`).
- **Suggests starting a new session** and gives you the text ready to copy and paste.

Why a new session? Every turn processes the whole history again. Starting fresh with the summary uses fewer tokens.

## How it works

1. The mod collects the **last 30 messages** (trimmed) and the session's **tool data**:
   - files written or edited successfully (`Edit`, `Write`, `MultiEdit`, `NotebookEdit`), without repeats; files only read do not count;
   - `Bash` or `PowerShell` commands, minus read-only ones (`ls`, `cd`, `pwd`, `cat`...); the last 15;
   - tools that ended in an error, with the first line of the message; the last 10.
2. It asks the **light model** (`haiku`) for the text sections: goal, decisions and pending, within the token limit you set.
3. It builds the summary: the model's sections plus files, commands and errors, which come from the real data (the model does not make them up).
4. It saves it to the file and shows the new-session suggestion.

### The two triggers

- **Automatic.** It saves the time when each turn ends. When you send a message and **2 hours or more** (configurable) have passed since the last turn, it generates the summary, adds it to that message's context, shows a short notice and leaves the copy-ready text in the session log.
  - **Limitation:** it only fires **when you type again**. A mod does not run while the session is idle, so there is no summary "at the 2-hour mark" if you type nothing. It also does not fire on the session's first message or on commands (`/something`).
- **On demand.** `/resumen` generates it right away, with no threshold.

### If the model fails

- Nothing is lost: the **last saved summary is not overwritten** and is still there with `/resumen-ver`.
- You get a warning with the reason (API error, empty reply, timeout...).
- You get a **partial summary** with the tool data (files, commands, errors); goal, decisions and pending show as "not available".
- For the automatic trigger, the mod **retries once** on your next message. If that fails too, it stops trying; use `/resumen` whenever you want.
- If the file cannot be written, the summary is still shown and `/resumen-ver` uses the copy kept in the session.

## Commands

| Command | What it does |
| --- | --- |
| `/resumen` | Generates the summary now, saves it and gives you the suggestion with the text to copy. |
| `/resumen-ver` | Shows the last saved summary (with its date), ready to copy. Does not call the model. |

Command output stays in the conversation, so the model reads it too.

It is drawn in monochrome, like the usage HUD: the first line and the summary header in white, each section with its title in white and a grey separator above it, and the rest in greys. No accent colors.

## Configuration

`userConfig` options. Change them with `claude plugin configure resumen-sesion@jarvis-essential-pack`, with `/config` or, with `--plugin-dir`, under `pluginConfigs` in `settings.json`:

| Option | What it is | Default |
| --- | --- | --- |
| `idleHours` | Hours of inactivity for the automatic trigger. Decimals allowed (`0.5` = half an hour). | `2` |
| `maxTokens` | Token limit of the model's reply (200 to 8000). | `800` |
| `includeFiles` | Include the files-touched section. | `true` |
| `language` | Language of the summary and notices: `es` or `en`. | `es` |
| `dataDir` | Folder where the summary is saved. Absolute path or starting with `~` (your user folder). | `~/CLAUDE/resumen-sesion` |

Example in `settings.json`:

```json
{
  "pluginConfigs": {
    "resumen-sesion": { "options": { "idleHours": 1.5, "maxTokens": 1200, "language": "en" } }
  }
}
```

## Where the summary is saved

In **`<dataDir>/ultimo-resumen.md`**; by default `~/CLAUDE/resumen-sesion/ultimo-resumen.md`. `~` is `USERPROFILE` on Windows and `HOME` on macOS and Linux; if unknown, the plugin's own `datos` folder is used.

The file starts with the date and the source (automatic or `/resumen`). Each new summary **replaces** the previous one; if the model fails, the previous one stays.

## Install

```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install resumen-sesion@jarvis-essential-pack
```

Or load it with `--plugin-dir` (see the [main README](../README.md#en-load)).

## What it does not do / limits

- It does nothing while the session is idle: the automatic trigger only fires when you type again.
- It does not open the new session for you: you do that by pasting the text.
- It summarizes the last 30 messages; the tool data covers the whole session.
- It keeps only the last summary, not a history.

## License

MIT © deriva1945-ui. See [LICENSE](LICENSE).
