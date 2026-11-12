# Historial de cambios · Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Versiones según [SemVer](https://semver.org/lang/es/).
Format based on Keep a Changelog. Versions follow SemVer.

## [0.1.0] - 2026-11-12

Primera publicación del pack `jarvis-essential-pack`. · First release of the `jarvis-essential-pack`.

### portero 0.1.0

- **ES:** Clasifica cada petición con reglas y, si dudan, con Haiku. Lo ligero lo responde el modelo de la sesión; lo pesado se delega a un subagente Opus. Atajos `!pesada` y `!ligera`.
- **EN:** Classifies each request with rules and, when unsure, with Haiku. Light work stays on the session model; heavy work goes to an Opus subagent. `!pesada` and `!ligera` shortcuts.

### resumen-sesion 0.1.0

- **ES:** Tras 2 horas sin actividad, al volver a escribir, Haiku crea un resumen de traspaso y un aviso sugiere abrir una sesión nueva.
- **EN:** After 2 idle hours, when you type again, Haiku writes a handover summary and a notice suggests starting a new session.

### consumo 0.1.0

- **ES:** Ventana HUD en directo con contexto, coste, tokens por agente y modelo, reparto entre modelos, últimos 20 turnos, barra del plan, alertas al 70 % y 85 %, aviso de "sin señal" y modo compacto. Diseño adaptable desde 420 px.
- **EN:** Live HUD window with context, cost, tokens per agent and model, model split, last 20 turns, plan bar, alerts at 70 % and 85 %, "no signal" notice and compact mode. Responsive from 420 px.

### jarvis-banda 0.1.0

- **ES:** Línea encima del prompt con el estado en vivo (esperando, procesando, ejecutando, delegando) y color por modelo. Se publica con `version` 0.2.0 en su `plugin.json`, que añade el modelo del subagente al delegar.
- **EN:** Line above the prompt with the live state (waiting, processing, running, delegating) and color per model. Ships with `version` 0.2.0 in its `plugin.json`, which adds the subagent's model while delegating.

### mods-estado 0.1.0

- **ES:** Comando `/mods`: ejecuta `claude plugin list`, marca los mods del pack y mira la copia local en `C:\CLAUDE\mods`.
- **EN:** `/mods` command: runs `claude plugin list`, marks the pack mods and checks the local copy in `C:\CLAUDE\mods`.

[0.1.0]: https://github.com/deriva1945-ui/portero-claude
