# consumo

**Español** · [English](#english)

Mod para Claude Code que abre una ventana HUD con lo que gasta la sesión.

![HUD de consumo](../images/consumo-1920x1080.jpg)

## Qué hace

- Al iniciar la sesión abre una ventana aparte con Edge o Chrome en modo aplicación (`--app`).
- Muestra el contexto usado y su porcentaje, el coste acumulado y los tokens por agente y por modelo.
- Muestra el reparto del trabajo entre modelos, una gráfica de tokens por turno y los últimos 20 turnos.
- Avisa cuando el contexto pasa del 70 % y del 85 %.
- Si los datos dejan de llegar durante 10 segundos, marca "sin señal".
- Funciona sin conexión: todo va dentro de la página.
- Se adapta al tamaño de la ventana. La tecla `D` cambia entre modo cómodo y compacto.

| 900 × 600 | 420 × 860 |
|---|---|
| ![900x600](../images/consumo-900x600.png) | ![420x860](../images/consumo-420x860.png) |

## Comando /jarvis

`/jarvis` abre o cierra el HUD:

- Si el HUD está cerrado, lo abre como al iniciar la sesión (Edge o Chrome con `--app`).
- Si está abierto, lo cierra. El mod no cierra la ventana del navegador por su cuenta, porque tendría que matar procesos de Edge que no son suyos. En su lugar escribe `C:\CLAUDE\consumo\estado.json` con `{"abierto": false}` (y `{"abierto": true}` antes de abrir). La página lo lee cada segundo, junto con `datos.js`, y al ver `abierto: false` llama a `window.close()`.
- Si `window.close()` no cierra la ventana, la página muestra "HUD cerrado. Escribe /jarvis para abrirlo." **`window.close()` puede no funcionar en todas las versiones de Edge: en ese caso cierra la ventana a mano.**

Archivos que crea en tu PC: `C:\CLAUDE\consumo\index.html` (la página), `C:\CLAUDE\consumo\datos.js` (los datos, se reescribe cada 3 segundos) y `C:\CLAUDE\consumo\estado.json` (si el HUD está abierto). También escribe `estado.js`, una copia de `estado.json` que la página carga como script, porque el navegador no deja leer un `.json` desde `file://`.

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
- It warns when context goes over 70 % and 85 %.
- If data stops arriving for 10 seconds, it shows "sin señal" (no signal).
- It works offline: everything is inside the page.
- It adapts to the window size. The `D` key switches between comfortable and compact mode.

| 900 × 600 | 420 × 860 |
|---|---|
| ![900x600](../images/consumo-900x600.png) | ![420x860](../images/consumo-420x860.png) |

## The /jarvis command

`/jarvis` opens or closes the HUD:

- If the HUD is closed, it opens it the same way as at session start (Edge or Chrome with `--app`).
- If it is open, it closes it. The mod does not close the browser window itself, because that would mean killing Edge processes it does not own. Instead it writes `C:\CLAUDE\consumo\estado.json` with `{"abierto": false}` (and `{"abierto": true}` before opening). The page reads it every second, together with `datos.js`, and when it sees `abierto: false` it calls `window.close()`.
- If `window.close()` does not close the window, the page shows "HUD cerrado. Escribe /jarvis para abrirlo." (HUD closed. Type /jarvis to open it.) **`window.close()` may not work in every Edge version: in that case close the window by hand.**

Files it creates on your PC: `C:\CLAUDE\consumo\index.html` (the page), `C:\CLAUDE\consumo\datos.js` (the data, rewritten every 3 seconds) and `C:\CLAUDE\consumo\estado.json` (whether the HUD is open). It also writes `estado.js`, a copy of `estado.json` that the page loads as a script, because the browser does not let a page read a `.json` file from `file://`.

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
