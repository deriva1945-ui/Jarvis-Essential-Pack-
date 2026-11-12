# mods-estado

**Español** · [English](#english)

Mod para Claude Code que añade el comando `/mods`: muestra qué plugins están instalados y activos, con su versión, y marca cuáles pertenecen al pack jarvis-essential-pack (portero, resumen-sesion, consumo, jarvis-banda). Si alguno del pack no está cargado, lo avisa.

## Instalación

```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install mods-estado@jarvis-essential-pack
```

## Qué hace

- Ejecuta `claude plugin list` (la API de mods no deja leer la lista de otros plugins) y resume su salida: estado, nombre, origen y versión de cada plugin, con `[pack]` en los del pack.
- Muestra una tabla del pack con `[x]` activo, `[ ]` no cargado o no instalado, y `[?]` si no se pudo leer la lista.
- Comprueba si existe la carpeta `C:\CLAUDE\mods` y qué mods del pack tienen copia allí; si no existe, indica "sin copia local".
- Si `claude` no está en el PATH o el proceso falla, lo dice en la salida en lugar de romperse.

Un mod cargado con `--plugin-dir` no aparece en `claude plugin list`, así que puede figurar como no cargado aunque esté en uso.

## Activar y desactivar mods

| Comando | Qué hace |
|---|---|
| `/mods` | Muestra el estado del pack, como arriba. |
| `/mods on <nombre>` | Ejecuta `claude plugin enable <nombre>`. |
| `/mods off <nombre>` | Ejecuta `claude plugin disable <nombre>`. |

- Solo acepta los mods del pack: `portero`, `resumen-sesion`, `consumo`, `jarvis-banda` y `mods-estado`. Cualquier otro nombre se rechaza con un mensaje y no se ejecuta nada.
- Si `claude` no arranca, prueba `claude.cmd` (Windows). Si el proceso falla, la salida dice por qué en vez de romperse.
- **El cambio se aplica en la próxima sesión.** El mod no recarga nada: tras un cambio responde "Hecho. El cambio se aplica en la próxima sesión; reinicia Claude Code."

---

<a id="english"></a>

# mods-estado (English)

A Claude Code mod that adds the `/mods` command: it shows which plugins are installed and active, with their version, and marks which ones belong to the jarvis-essential-pack (portero, resumen-sesion, consumo, jarvis-banda). If one from the pack is not loaded, it says so.

## Install

```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install mods-estado@jarvis-essential-pack
```

## What it does

- Runs `claude plugin list` (the mods API cannot read the list of other plugins) and summarises its output: state, name, source and version of each plugin, with `[pack]` on the pack's ones.
- Shows a table of the pack with `[x]` active, `[ ]` not loaded or not installed, and `[?]` if the list could not be read.
- Checks whether the `C:\CLAUDE\mods` folder exists and which pack mods have a copy there; if it does not exist, it says "sin copia local" (no local copy).
- If `claude` is not on the PATH or the process fails, it says so in the output instead of breaking.

A mod loaded with `--plugin-dir` does not appear in `claude plugin list`, so it may show as not loaded even while in use.

## Turning mods on and off

| Command | What it does |
|---|---|
| `/mods` | Shows the pack's state, as above. |
| `/mods on <name>` | Runs `claude plugin enable <name>`. |
| `/mods off <name>` | Runs `claude plugin disable <name>`. |

- It only accepts the pack's mods: `portero`, `resumen-sesion`, `consumo`, `jarvis-banda` and `mods-estado`. Any other name is rejected with a message and nothing runs.
- If `claude` does not start, it tries `claude.cmd` (Windows). If the process fails, the output says why instead of breaking.
- **The change applies from the next session.** The mod does not reload anything: after a change it answers "Hecho. El cambio se aplica en la próxima sesión; reinicia Claude Code." (Done. The change applies in the next session; restart Claude Code.)
