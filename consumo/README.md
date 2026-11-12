<a id="es"></a>

# consumo

**Español** · [English](#en)

Abre una ventana HUD en directo con lo que gasta la sesión: contexto, coste y tokens. Estética blanco-cian sobre fondo azul-negro, con la barra del plan arriba.

![HUD de consumo](../images/consumo-1920x1080.jpg)

## Qué hace

- Al iniciar la sesión abre una ventana aparte con Edge o Chrome en modo aplicación (`--app`).
- Arriba, una barra de progreso del plan de Claude (las tareas que crea y actualiza), con la lista plegable.
- Contexto usado y su porcentaje, coste acumulado y tokens por agente y por modelo.
- Reparto del trabajo entre modelos, gráfica de tokens por turno y los últimos 20 turnos.
- Avisa cuando el contexto pasa del **70 %** y del **85 %**: por encima del 85 % el HUD entero pasa a rojo de alerta.
- Si los datos dejan de llegar 10 segundos, marca "sin señal".
- Funciona sin conexión: todo va dentro de la página.
- La tecla `D` (o el botón de la cabecera) cambia entre modo cómodo y compacto. La elección se recuerda.

Se adapta al tamaño de la ventana:

| Ancho | Diseño |
|---|---|
| 1600 px o más | rejilla completa, con la gráfica de tokens por turno |
| 900 a 1599 px | dos columnas, sin la gráfica |
| menos de 900 px | una columna; funciona desde 420 px sin desplazamiento horizontal |

| 900 × 600 | 420 × 860 |
|---|---|
| ![900x600](../images/consumo-900x600.png) | ![420x860](../images/consumo-420x860.png) |

| Plan completo | Contexto crítico |
|---|---|
| ![Plan completo](../images/consumo-plan-completo.jpg) | ![Contexto crítico](../images/consumo-critico.jpg) |

*Capturas con datos de ejemplo.*

## Cómo funciona

1. **Al iniciar la sesión** escribe la página `C:\CLAUDE\consumo\index.html` y la abre con Edge (o Chrome si no hay Edge).
2. Escucha los eventos de **turno terminado**, **herramienta** y **subagente** (`turn.complete`, `tool.call`, `agent.spawn`).
3. En cada turno suma los tokens de entrada, salida y caché por agente y por modelo, y guarda los últimos 20 turnos.
4. El **coste** sale del contador de la propia sesión: el coste de un turno es lo que sube ese contador. No usa tabla de precios.
5. Las llamadas a `TaskCreate` y `TaskUpdate` alimentan la barra del plan.
6. Todo se escribe en `C:\CLAUDE\consumo\datos.js` tras cada turno o herramienta, y además cada 3 segundos como latido.
7. **La página recarga `datos.js` cada segundo** y redibuja. Si en 10 segundos no llega un latido nuevo, muestra "sin señal".

## Cómo se instala

```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install consumo@jarvis-essential-pack
```

O cárgalo con `--plugin-dir` (ver el [README principal](../README.md#es-cargar)).

Requisitos: Windows con Edge o Chrome.

## Qué no hace / límites

- No funciona fuera de Windows: la ruta `C:\CLAUDE\consumo` y el comando `start` son de Windows.
- No se ha probado en todos los PC. Puede variar con la versión de Windows, el navegador o el escalado de pantalla.
- Sin navegador no abre la ventana. Los datos se siguen guardando y puedes abrir la página a mano.
- El coste por turno es aproximado cuando hay varios agentes a la vez.

## Licencia

MIT © deriva1945-ui. Ver [LICENSE](LICENSE).

---

<a id="en"></a>

# consumo (English)

[Español](#es) · **English**

Opens a live HUD window with what the session spends: context, cost and tokens. White-cyan look on a blue-black background, with the plan bar at the top.

![consumo HUD](../images/consumo-1920x1080.jpg)

## What it does

- When the session starts, it opens a separate window with Edge or Chrome in app mode (`--app`).
- At the top, a progress bar for Claude's plan (the tasks it creates and updates), with a collapsible list.
- Context used and its percentage, total cost, and tokens per agent and per model.
- How work is split between models, a tokens-per-turn chart, and the last 20 turns.
- It warns when context goes over **70 %** and **85 %**: above 85 % the whole HUD turns alert red.
- If data stops arriving for 10 seconds, it shows "sin señal" (no signal).
- It works offline: everything is inside the page.
- The `D` key (or the header button) switches between comfortable and compact mode. The choice is remembered.

It adapts to the window size:

| Width | Layout |
|---|---|
| 1600 px or more | full grid, with the tokens-per-turn chart |
| 900 to 1599 px | two columns, without the chart |
| under 900 px | one column; works from 420 px with no horizontal scroll |

| 900 × 600 | 420 × 860 |
|---|---|
| ![900x600](../images/consumo-900x600.png) | ![420x860](../images/consumo-420x860.png) |

| Plan complete | Critical context |
|---|---|
| ![Plan complete](../images/consumo-plan-completo.jpg) | ![Critical context](../images/consumo-critico.jpg) |

*Screenshots with sample data.*

## How it works

1. **When the session starts** it writes the page `C:\CLAUDE\consumo\index.html` and opens it with Edge (or Chrome if Edge is missing).
2. It listens to the **turn ended**, **tool** and **subagent** events (`turn.complete`, `tool.call`, `agent.spawn`).
3. On each turn it adds up input, output and cache tokens per agent and per model, and keeps the last 20 turns.
4. **Cost** comes from the session's own counter: a turn's cost is how much that counter went up. No price table.
5. Calls to `TaskCreate` and `TaskUpdate` feed the plan bar.
6. Everything is written to `C:\CLAUDE\consumo\datos.js` after each turn or tool, and every 3 seconds as a heartbeat.
7. **The page reloads `datos.js` every second** and redraws. If no new heartbeat arrives in 10 seconds, it shows "sin señal".

## Install

```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install consumo@jarvis-essential-pack
```

Or load it with `--plugin-dir` (see the [main README](../README.md#en-load)).

Requirements: Windows with Edge or Chrome.

## What it does not do / limits

- It does not work outside Windows: the `C:\CLAUDE\consumo` path and the `start` command are Windows-only.
- It has not been tested on every PC. It may vary with the Windows version, the browser or display scaling.
- With no browser, it does not open the window. Data is still saved and you can open the page by hand.
- Cost per turn is approximate when several agents run at once.

## License

MIT © deriva1945-ui. See [LICENSE](LICENSE).
