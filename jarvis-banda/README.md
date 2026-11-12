# jarvis-banda

**Español** · [English](#english)

Mod para Claude Code que dibuja una línea estilo J.A.R.V.I.S. encima del prompt con el estado en vivo de la sesión.

![jarvis-banda delegando](../images/banda-delegando.png)

*Aproximación en HTML, no es la salida real de la terminal.*

## Qué hace

Una sola línea que cambia con lo que pasa en la sesión:

| Símbolo | Estado | Cuándo |
|---|---|---|
| ◌ | ESPERANDO ÓRDENES | al empezar la sesión y al terminar cada turno |
| ◐ | PROCESANDO · modelo | al enviar un mensaje, y al terminar una herramienta o subagente |
| ◑ | EJECUTANDO herramienta | mientras corre una herramienta (Bash, Edit…) |
| ◒ | DELEGANDO → tipo (modelo) | al lanzar un subagente |

El color depende del modelo: Haiku cian, Opus ámbar, Fable violeta, otros blanco azulado. Al delegar, toma el color del modelo del subagente.

| Esperando | Procesando | Ejecutando |
|---|---|---|
| ![esperando](../images/banda-esperando.png) | ![procesando](../images/banda-procesando.png) | ![ejecutando](../images/banda-ejecutando.png) |

## Instalación

```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install jarvis-banda@jarvis-essential-pack
```

## Qué no hace

- No muestra coste ni contexto: eso está en el mod `consumo`.
- No toca la línea de estado ni muestra avisos.
- No usa temporizadores: solo cambia cuando hay un evento.
- Si algo falla al leer el estado, la línea desaparece y el prompt sigue normal.
- No se ha probado dentro de todas las terminales de Windows.

## Licencia

MIT. Ver [LICENSE](LICENSE).

---

<a id="english"></a>

# jarvis-banda (English)

A Claude Code mod that draws one J.A.R.V.I.S.-style line above the prompt with the session's live state.

![jarvis-banda delegating](../images/banda-delegando.png)

*HTML approximation, not the real terminal output.*

## What it does

One line that changes with what happens in the session (labels are in Spanish):

| Symbol | State | When |
|---|---|---|
| ◌ | ESPERANDO ÓRDENES (awaiting orders) | when the session starts and after each turn |
| ◐ | PROCESANDO · model (processing) | when you send a message, and after a tool or subagent ends |
| ◑ | EJECUTANDO tool (running) | while a tool runs (Bash, Edit…) |
| ◒ | DELEGANDO → type (model) (delegating) | when a subagent starts |

The color depends on the model: Haiku cyan, Opus amber, Fable violet, others bluish white. While delegating, it uses the subagent's model color.

| Waiting | Processing | Running |
|---|---|---|
| ![waiting](../images/banda-esperando.png) | ![processing](../images/banda-procesando.png) | ![running](../images/banda-ejecutando.png) |

## Install

```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install jarvis-banda@jarvis-essential-pack
```

## What it does not do

- It does not show cost or context: that is the `consumo` mod.
- It does not touch the status line or show notices.
- It uses no timers: it only changes when an event happens.
- If reading the state fails, the line disappears and the prompt works as usual.
- It has not been tested in every Windows terminal.

## License

MIT. See [LICENSE](LICENSE).
