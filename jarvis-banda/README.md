# jarvis-banda

Mod para Claude Code que dibuja una banda estilo HUD de J.A.R.V.I.S. encima del prompt. Reacciona a lo que pasa en la sesión y cambia de color según el modelo que trabaja.

```
◑ J.A.R.V.I.S. // ONLINE · MODELO OPUS-5.5 · CTX 5% · TAREA: Bash
EJECUTANDO Bash
```

## Instalación

```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install jarvis-banda@portero-claude
```

## Qué hace

Estados (cambian por eventos, sin temporizadores):

| Símbolo | Estado | Cuándo |
|---|---|---|
| ◌ | ESPERANDO ÓRDENES | al iniciar la sesión |
| ◐ | PROCESANDO · <modelo> | al enviar un prompt, y al terminar cada herramienta |
| ◑ | EJECUTANDO <herramienta> | mientras corre una herramienta del hilo principal |
| ◒ | DELEGANDO → <tipo> (<modelo>) | al lanzar un subagente |
| ● | TAREA COMPLETADA · <tokens> · <coste> | al terminar el turno; vuelve a procesar con el siguiente prompt |

Color por modelo: Haiku cian (#7dd3fc), Opus ámbar (#fbbf24), Fable violeta (#c4b5fd), cualquier otro blanco azulado (#dbeafe). Mientras se delega, la banda toma el color del modelo del subagente (ámbar si es Opus).

Al terminar un turno la banda añade:

- REPARTO: porcentaje de tokens (entrada + salida) por familia de modelo en ese turno, hilo principal y subagentes juntos (por ejemplo, HAIKU 30% · OPUS 70%).
- CTX: barra de 10 segmentos con el contexto usado, el porcentaje y los tokens frente a la ventana.

Además:

- Pone el estado actual en la línea de estado de Claude Code.
- Muestra un aviso (toast) al terminar cada turno, con tokens y coste del turno.
- Muestra un aviso cuando termina un subagente que corre en Opus.

El coste del turno sale del contador de la sesión (diferencia entre el inicio y el final del turno). Si alguna lectura falla, la banda cede su sitio y no rompe el prompt.
