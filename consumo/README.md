# consumo

**Español** · [English](#english)

Mod para Claude Code que abre una ventana HUD con lo que gasta la sesión.

![HUD de consumo](../images/consumo-1920x1080.jpg)

## Qué hace

- Al iniciar la sesión abre una ventana aparte con Edge o Chrome en modo aplicación (`--app`).
- Muestra el contexto usado y su porcentaje, el coste acumulado y los tokens por agente y por modelo.
- Muestra el reparto del trabajo entre modelos, una gráfica de tokens por turno y los últimos 20 turnos.
- Compara Haiku frente a Opus: lo que costó la sesión y lo que habría costado si el trabajo enviado a Haiku hubiera ido a Opus, con el coste por token de tus propios turnos. Sin datos de los dos modelos no estima nada.
- Avisa cuando el contexto pasa del 70 % y del 85 %.
- Si los datos dejan de llegar durante 10 segundos, marca "sin señal".
- Funciona sin conexión: todo va dentro de la página.
- Se adapta al tamaño de la ventana. La tecla `D` cambia entre modo cómodo y compacto.

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
- It shows context used and its percentage, total cost, and tokens per agent and per model.
- It shows how work is split between models, a chart of tokens per turn, and the last 20 turns.
- It compares Haiku with Opus: what the session cost and what it would have cost if the work sent to Haiku had gone to Opus, using the cost per token of your own turns. Without data from both models it does not estimate.
- It warns when context goes over 70 % and 85 %.
- If data stops arriving for 10 seconds, it shows "sin señal" (no signal).
- It works offline: everything is inside the page.
- It adapts to the window size. The `D` key switches between comfortable and compact mode.

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
