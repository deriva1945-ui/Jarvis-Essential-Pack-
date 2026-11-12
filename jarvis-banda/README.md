# jarvis-banda

Mod para Claude Code que dibuja una línea estilo HUD de J.A.R.V.I.S. encima del prompt con el estado en vivo de la sesión. Cambia de color según el modelo que trabaja.

```
◑ J.A.R.V.I.S. // EJECUTANDO Bash
```

## Instalación

```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install jarvis-banda@portero-claude
```

## Qué hace

Una sola línea que cambia por eventos, sin temporizadores:

| Símbolo | Estado | Cuándo |
|---|---|---|
| ◌ | ESPERANDO ÓRDENES | al iniciar la sesión y al terminar cada turno |
| ◐ | PROCESANDO · <modelo> | al enviar un prompt, y al terminar cada herramienta o subagente |
| ◑ | EJECUTANDO <herramienta> | mientras corre una herramienta del hilo principal |
| ◒ | DELEGANDO → <tipo> (<modelo>) | al lanzar un subagente |

Color por modelo: Haiku cian (#7dd3fc), Opus ámbar (#fbbf24), Fable violeta (#c4b5fd), cualquier otro blanco azulado (#dbeafe). Mientras se delega, la línea toma el color del modelo del subagente (ámbar si es Opus).

No repite lo que ya está a la vista: el resumen del turno queda en el chat, y el contexto y el coste en el HUD. No muestra avisos ni toca la línea de estado. Si alguna lectura falla, la banda cede su sitio y no rompe el prompt.
