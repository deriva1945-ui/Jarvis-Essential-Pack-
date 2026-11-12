<a id="es"></a>

# mods-estado

**Español** · [English](#en)

Añade el comando `/mods`: te dice qué plugins están activos y qué mods del pack faltan. Con `/mods on <nombre>` y `/mods off <nombre>` activa o desactiva un mod del pack.

![Salida de /mods](../images/mods-terminal.png)

*Ejemplo en HTML, no es una captura real.*

## Qué hace

- Lista cada plugin con su estado, nombre, origen y versión. Marca con `[pack]` los del pack.
- Muestra una tabla del pack:

| Marca | Significado |
|---|---|
| `[x]` | activo |
| `[ ]` | no cargado o no instalado |
| `[?]` | no pudo leer la lista |

- Dice si existe la [carpeta del pack](#es-carpeta) (opción `modsDir`) y qué mods tienen copia allí.
- Si `claude` no está en el PATH o el comando falla, lo explica en vez de romperse.

### Activar y desactivar mods

| Comando | Qué hace |
|---|---|
| `/mods` | muestra el informe de arriba |
| `/mods on <nombre>` | ejecuta `claude plugin enable <nombre>` |
| `/mods off <nombre>` | ejecuta `claude plugin disable <nombre>` |

- Solo acepta los nombres del pack: `portero`, `resumen-sesion`, `consumo`, `jarvis-banda` y `mods-estado`. Con cualquier otro nombre no ejecuta nada y te dice cuáles valen.
- Si va bien responde: "Hecho. El cambio se aplica en la próxima sesión; reinicia Claude Code."
- Si falla (sin `claude` en el PATH, código de error…) explica el motivo.

## Cómo funciona

1. Al **iniciar la sesión** registra el comando `/mods` (con `on` y `off` como argumentos opcionales).
2. Al escribir `/mods`, **ejecuta `claude plugin list`** (y prueba `claude.cmd` en Windows si hace falta).
3. Lee la salida línea a línea: nombre, origen, versión y estado de cada plugin.
4. **Compara con el pack:** busca `portero`, `resumen-sesion`, `consumo` y `jarvis-banda` y marca cada uno.
5. Mira si hay copia local en la carpeta `modsDir` y desde qué carpeta se cargó el propio mods-estado.
6. Devuelve todo como texto en la conversación.
7. Con `on` u `off` comprueba el nombre y ejecuta `claude plugin enable` o `claude plugin disable` (también prueba `claude.cmd`). No recarga nada en la sesión actual.

## Cómo se instala

```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install mods-estado@jarvis-essential-pack
```

O cárgalo con `--plugin-dir` (ver el [README principal](../README.md#es-cargar)). Luego escribe `/mods`, `/mods on <nombre>` o `/mods off <nombre>`.

<a id="es-carpeta"></a>

## Carpeta del pack

La opción **`modsDir`** dice dónde está tu copia local del pack (una subcarpeta por mod), la misma que usas con `--plugin-dir`.

- **Valor por defecto:** `~/CLAUDE/mods`. `~` es tu carpeta de usuario: `%USERPROFILE%` en Windows (por ejemplo `C:\Users\<tú>\CLAUDE\mods`), `$HOME` en macOS y Linux.
- Acepta una ruta absoluta o una que empiece por `~`. Una ruta relativa cuenta desde tu carpeta de usuario.
- Si la carpeta no existe, `/mods` dice "sin copia local".

Para verla o cambiarla en un mod instalado:

```
claude plugin configure mods-estado@jarvis-essential-pack
echo '{"modsDir": "~/CLAUDE/mods"}' | claude plugin configure mods-estado@jarvis-essential-pack --values-stdin
```

También puedes cambiarla dentro de Claude Code con `/plugin configure mods-estado@jarvis-essential-pack` o en `/config`. Si cargas el mod con `--plugin-dir`, guarda el valor en `~/.claude/settings.json`:

```json
{ "pluginConfigs": { "mods-estado": { "options": { "modsDir": "~/CLAUDE/mods" } } } }
```

El cambio se aplica al reiniciar Claude Code.

## Qué no hace / límites

- No ve los mods cargados con `--plugin-dir`: salen como "no cargado" aunque estén en uso.
- No instala mods: `/mods on` y `/mods off` solo activan o desactivan los que ya están instalados.
- El cambio de `/mods on` y `/mods off` vale desde la próxima sesión, no en la actual.
- Con los mods cargados con `--plugin-dir`, `/mods on` y `/mods off` no sirven: cambia la lista de la función de PowerShell.
- Necesita el comando `claude` en el PATH.

## Licencia

MIT © deriva1945-ui. Ver [LICENSE](LICENSE).

---

<a id="en"></a>

# mods-estado (English)

[Español](#es) · **English**

Adds the `/mods` command: it tells you which plugins are active and which pack mods are missing. `/mods on <name>` and `/mods off <name>` enable or disable a pack mod.

![/mods output](../images/mods-terminal.png)

*HTML example, not a real screenshot. The output is in Spanish.*

## What it does

- Lists each plugin with its state, name, source and version. Pack plugins get a `[pack]` tag.
- Shows a pack table:

| Mark | Meaning |
|---|---|
| `[x]` | active |
| `[ ]` | not loaded or not installed |
| `[?]` | the list could not be read |

- Says whether the [pack folder](#en-folder) (`modsDir` option) exists and which mods have a copy there.
- If `claude` is not on the PATH or the command fails, it explains instead of breaking.

### Enable and disable mods

| Command | What it does |
|---|---|
| `/mods` | shows the report above |
| `/mods on <name>` | runs `claude plugin enable <name>` |
| `/mods off <name>` | runs `claude plugin disable <name>` |

- It only accepts the pack names: `portero`, `resumen-sesion`, `consumo`, `jarvis-banda` and `mods-estado`. With any other name it runs nothing and lists the valid ones.
- On success it replies: "Hecho. El cambio se aplica en la próxima sesión; reinicia Claude Code." (Done. The change applies from the next session; restart Claude Code.)
- If it fails (no `claude` on the PATH, an error code…) it explains why.

## How it works

1. When **the session starts** it registers the `/mods` command (with optional `on` and `off` arguments).
2. When you type `/mods`, it **runs `claude plugin list`** (and tries `claude.cmd` on Windows if needed).
3. It reads the output line by line: name, source, version and state of each plugin.
4. **It compares with the pack:** it looks for `portero`, `resumen-sesion`, `consumo` and `jarvis-banda` and marks each one.
5. It checks for a local copy in the `modsDir` folder and which folder mods-estado itself was loaded from.
6. It returns everything as text in the conversation.
7. With `on` or `off` it checks the name and runs `claude plugin enable` or `claude plugin disable` (also trying `claude.cmd`). It does not reload anything in the current session.

## Install

```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install mods-estado@jarvis-essential-pack
```

Or load it with `--plugin-dir` (see the [main README](../README.md#en-load)). Then type `/mods`, `/mods on <name>` or `/mods off <name>`.

<a id="en-folder"></a>

## Pack folder

The **`modsDir`** option says where your local copy of the pack is (one subfolder per mod), the same one you use with `--plugin-dir`.

- **Default:** `~/CLAUDE/mods`. `~` is your user folder: `%USERPROFILE%` on Windows (for example `C:\Users\<you>\CLAUDE\mods`), `$HOME` on macOS and Linux.
- It takes an absolute path or one starting with `~`. A relative path counts from your user folder.
- If the folder does not exist, `/mods` says "sin copia local" (no local copy).

To see or change it for an installed mod:

```
claude plugin configure mods-estado@jarvis-essential-pack
echo '{"modsDir": "~/CLAUDE/mods"}' | claude plugin configure mods-estado@jarvis-essential-pack --values-stdin
```

You can also change it inside Claude Code with `/plugin configure mods-estado@jarvis-essential-pack` or in `/config`. If you load the mod with `--plugin-dir`, save the value in `~/.claude/settings.json`:

```json
{ "pluginConfigs": { "mods-estado": { "options": { "modsDir": "~/CLAUDE/mods" } } } }
```

The change applies when you restart Claude Code.

## What it does not do / limits

- It cannot see mods loaded with `--plugin-dir`: they show as "not loaded" even when in use.
- It does not install mods: `/mods on` and `/mods off` only enable or disable the ones already installed.
- The change from `/mods on` and `/mods off` applies from the next session, not the current one.
- For mods loaded with `--plugin-dir`, `/mods on` and `/mods off` do not help: edit the list in the PowerShell function.
- It needs the `claude` command on your PATH.

## License

MIT © deriva1945-ui. See [LICENSE](LICENSE).
