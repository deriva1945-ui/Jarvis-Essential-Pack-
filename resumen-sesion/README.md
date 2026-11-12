<a id="es"></a>

# resumen-sesion

**Español** · [English](#en)

Te ayuda a retomar una sesión tras un rato sin escribir, con un resumen de traspaso.

![Ejemplo de resumen-sesion](../images/resumen-terminal.png)

*Ejemplo en HTML, no es una captura real.*

## Qué hace

- Si escribes tras **2 horas o más** sin actividad, pide a Haiku un resumen de traspaso: objetivo, decisiones, archivos tocados y lo pendiente.
- El resumen entra en el contexto de ese turno.
- Un aviso te sugiere abrir una sesión nueva con ese resumen.

¿Por qué una sesión nueva? En cada turno se vuelve a procesar todo el historial. Empezar de cero con el resumen gasta menos tokens.

## Cómo funciona

1. Al **terminar cada turno** (`turn.complete`) guarda la hora en un estado pequeño del mod.
2. Al **enviar un mensaje** (`prompt.submit`) compara la hora actual con la guardada.
3. Si han pasado menos de 2 horas, o es el primer mensaje, no hace nada.
4. Si han pasado 2 horas o más, toma los últimos 30 mensajes (recortados) y pide a Haiku un resumen de unas 10 líneas.
5. Añade el resumen al contexto de tu mensaje y muestra un aviso con las horas que llevabas fuera.
6. Si Haiku no responde, el mensaje sigue sin cambios.

Para cambiar las 2 horas, edita `IDLE_MS` en [`hooks/register.tsx`](hooks/register.tsx).

## Cómo se instala

```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install resumen-sesion@jarvis-essential-pack
```

O cárgalo con `--plugin-dir` (ver el [README principal](../README.md#es-cargar)).

## Qué no hace / límites

- No actúa mientras la sesión está parada. Solo actúa cuando vuelves a escribir.
- No abre la sesión nueva por ti: eso lo haces tú.
- Resume solo los últimos 30 mensajes. Si Haiku no responde, no añade nada.

## Licencia

MIT © deriva1945-ui. Ver [LICENSE](LICENSE).

---

<a id="en"></a>

# resumen-sesion (English)

[Español](#es) · **English**

Helps you pick a session back up after a break, with a handover summary.

![resumen-sesion example](../images/resumen-terminal.png)

*HTML example, not a real screenshot.*

## What it does

- When you type after **2 hours or more** of no activity, it asks Haiku for a handover summary: goal, decisions, files touched and what is left.
- The summary is added to that turn's context.
- A notice suggests opening a new session with that summary.

Why a new session? Every turn processes the whole history again. Starting fresh with the summary uses fewer tokens.

## How it works

1. When **each turn ends** (`turn.complete`) it saves the time in a small mod state.
2. When **you send a message** (`prompt.submit`) it compares the current time with the saved one.
3. If less than 2 hours have passed, or it is the first message, it does nothing.
4. If 2 hours or more have passed, it takes the last 30 messages (trimmed) and asks Haiku for a summary of about 10 lines.
5. It adds the summary to your message's context and shows a notice with how many hours you were away.
6. If Haiku does not answer, the message goes on unchanged.

To change the 2 hours, edit `IDLE_MS` in [`hooks/register.tsx`](hooks/register.tsx).

## Install

```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install resumen-sesion@jarvis-essential-pack
```

Or load it with `--plugin-dir` (see the [main README](../README.md#en-load)).

## What it does not do / limits

- It does nothing while the session is idle. It only acts when you type again.
- It does not open the new session for you.
- It only summarizes the last 30 messages. If Haiku does not answer, it adds nothing.

## License

MIT © deriva1945-ui. See [LICENSE](LICENSE).
