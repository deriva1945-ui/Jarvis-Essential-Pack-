# consumo

**Español** · [English](#english)

Mod para Claude Code que abre una ventana HUD con lo que gasta la sesión.

![HUD de consumo](../images/consumo-1920x1080.jpg)

## Qué hace

- Al iniciar la sesión abre una ventana aparte con Edge o Chrome en modo aplicación (`--app`).
- Arriba, a todo el ancho, una barra de progreso del plan de Claude (las tareas que crea y actualiza), con la lista de tareas plegable.
- Muestra el contexto usado y su porcentaje, el coste acumulado y los tokens por agente y por modelo.
- Muestra el reparto del trabajo entre modelos, una gráfica de tokens por turno y los últimos 20 turnos.
- Avisa cuando el contexto pasa del 70 % y del 85 %.
- Si los datos dejan de llegar durante 10 segundos, marca "sin señal".
- Funciona sin conexión: todo va dentro de la página.
- Estética blanco-cian: fondo azul-negro con nebulosa y rejilla de perspectiva, paneles de cristal y un globo holográfico con un anillo 3D inclinado que gira para el contexto. El rojo solo aparece en las alertas.
- Se adapta al tamaño de la ventana:
  - 1600 px o más: rejilla completa, con la gráfica de tokens por turno.
  - De 900 a 1599 px: dos columnas, sin la gráfica.
  - Menos de 900 px: una columna. Funciona desde 420 px de ancho sin desplazamiento horizontal.
- La tecla `D` (o el botón de la cabecera) cambia entre modo cómodo y compacto. El modo compacto oculta los últimos turnos y la lista del plan, y deja el fondo quieto. La elección se recuerda.

| 900 × 600 | 420 × 860 |
|---|---|
| ![900x600](../images/consumo-900x600.png) | ![420x860](../images/consumo-420x860.png) |

Archivos que crea en tu PC: `C:\CLAUDE\consumo\index.html` (la página) y `C:\CLAUDE\consumo\datos.js` (los datos, se reescribe cada 3 segundos).

El coste sale del contador de la propia sesión. No usa una tabla de precios.

## Instalación

```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install consumo@jarvis-essential-pack
```

Requisitos: Windows con Edge o Chrome.

## Qué no hace

- No funciona fuera de Windows: la ruta `C:\CLAUDE\consumo` y el comando `start` son de Windows.
- No se ha probado en todos los PC. Puede variar con la versión de Windows, del navegador o con el escalado de pantalla.
- Si no hay navegador, no abre la ventana. Los datos se siguen guardando y puedes abrir la página a mano.
- El coste por turno es aproximado cuando hay varios agentes a la vez.

## Licencia

MIT. Ver [LICENSE](LICENSE).

---

<a id="english"></a>

# consumo (English)

A Claude Code mod that opens a HUD window showing what the session spends.

![consumo HUD](../images/consumo-1920x1080.jpg)

## What it does

- When the session starts, it opens a separate window with Edge or Chrome in app mode (`--app`).
- At the top, full width, a progress bar for Claude's plan (the tasks it creates and updates), with a collapsible task list.
- It shows context used and its percentage, total cost, and tokens per agent and per model.
- It shows how work is split between models, a chart of tokens per turn, and the last 20 turns.
- It warns when context goes over 70 % and 85 %.
- If data stops arriving for 10 seconds, it shows "sin señal" (no signal).
- It works offline: everything is inside the page.
- White-cyan look: blue-black background with a nebula and a perspective grid, glass panels, and a holographic globe with a tilted, spinning 3D ring for context. Red only appears in alerts.
- It adapts to the window size:
  - 1600 px or more: full grid, with the tokens-per-turn chart.
  - 900 to 1599 px: two columns, without the chart.
  - Under 900 px: one column. It works from 420 px wide with no horizontal scroll.
- The `D` key (or the header button) switches between comfortable and compact mode. Compact mode hides the last turns and the plan list, and keeps the background still. The choice is remembered.

| 900 × 600 | 420 × 860 |
|---|---|
| ![900x600](../images/consumo-900x600.png) | ![420x860](../images/consumo-420x860.png) |

Files it creates on your PC: `C:\CLAUDE\consumo\index.html` (the page) and `C:\CLAUDE\consumo\datos.js` (the data, rewritten every 3 seconds).

Cost comes from the session's own counter. It does not use a price table.

## Install

```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install consumo@jarvis-essential-pack
```

Requirements: Windows with Edge or Chrome.

## What it does not do

- It does not work outside Windows: the `C:\CLAUDE\consumo` path and the `start` command are Windows-only.
- It has not been tested on every PC. It may vary with the Windows version, the browser, or display scaling.
- With no browser, it does not open the window. Data is still saved and you can open the page by hand.
- Cost per turn is approximate when several agents run at once.

## License

MIT. See [LICENSE](LICENSE).
