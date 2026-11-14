# How it works inside

[Español](como-funciona.md) · **English** · [← Back to the README](../README.md#en)

All five mods follow the same path: **events → hooks → data → screen**.

![Architecture: events, hooks, data and screen](../images/arquitectura.png)

## The four pieces

| Piece | What it is |
|---|---|
| **Events** | Claude Code reports what happens: `session.start` (the session starts), `prompt.submit` (you send a message), `tool.call` (a tool runs), `agent.spawn` (a subagent starts), `turn.complete` (a turn ends), `ui.render` (an area of the screen is drawn) and `command.run` (you type one of the mod's commands). |
| **Hooks** | Each mod has a `hooks/register.tsx` file. It says which events the mod listens to and what it does with each one. |
| **Data** | What the mod remembers between events. It is small: a time, a few counters, a phase. `consumo`, `portero` and `resumen-sesion` also write files to their data folder. |
| **Screen** | Where you see the result: a line, a notice, a HUD window, a text in the chat, or Claude's own turn. |

## Mod by mod

| Mod | Listens to | Keeps | Shows |
|---|---|---|---|
| [portero](../portero/) | `session.start`, `prompt.submit`, `agent.spawn`, `command.run` | the turn's route (light, heavy or unsure) and the `decisiones.jsonl` log | a note in the turn, an Opus subagent when heavy, the status line and the `/portero` report |
| [resumen-sesion](../resumen-sesion/) | `session.start`, `turn.complete`, `prompt.submit`, `command.run` | the time of the last turn and `ultimo-resumen.md` | a Haiku handover summary in context, a notice and the `/resumen` and `/resumen-ver` replies |
| [consumo](../consumo/) | `session.start`, `turn.complete`, `tool.call`, `agent.spawn`, `command.run` | tokens, cost, turns, plan, the Haiku/Opus comparison, totals across sessions and whether the HUD is open; written to `datos.js`, `estado.js` and `historico.json` | a HUD window that reloads `datos.js` every second, and the `/jarvis` reply |
| [jarvis-banda](../jarvis-banda/) | `session.start`, `prompt.submit`, `tool.call`, `tool.check`, `turn.step`, `agent.spawn`, `turn.complete`, `ui.render`, `command.run` | phase, tool, models, context and pulse | a monochrome line above the prompt and the `/banda` reply |
| [mods-estado](../mods-estado/) | `session.start`, `command.run` | nothing: it works it out on the spot | the `/mods` check-up and the `/mods on`, `/mods off`, `/mods update` and `/mods help` replies |

## Rules they all follow

- **They do not break the session.** If a mod fails, it lets the event through unchanged.
- **They only listen to what they need.** A mod does not see events it does not ask for.
- **They do not store your whole conversation.** Only three mods write to disk, each in its own data folder (`dataDir` option):
  - `consumo` (`~/CLAUDE/consumo`): the page, `datos.js` (numbers, model names, each subagent's short description and plan task titles), `estado.json` / `estado.js` (whether the HUD is open) and `historico.json` (only figures and model and agent-type names, never prompt text). The page also keeps three view preferences in the browser (localStorage): the currency picked with the button, and whether the plan list and the foco list are open.
  - `portero` (`~/CLAUDE/portero`): `decisiones.jsonl`, with the route, layer, reason and the request text cut short with obvious secrets masked. Turn it off with `logEnabled`.
  - `resumen-sesion` (`~/CLAUDE/resumen-sesion`): `ultimo-resumen.md`, the last handover summary.
