<a id="es"></a>

# mods-estado

**Español** · [English](#en)

Añade el comando `/mods`: un diagnóstico del pack `jarvis-essential-pack`. Por cada mod te dice si está activo, qué versión está instalada, qué versión tiene tu copia local y si alguno falló al cargar. Avisa de restos del marketplace antiguo `portero-claude` y te da los comandos para actualizar, sin ejecutar nada por su cuenta.

![Salida de /mods](../images/mods-terminal.png)

*Ejemplo en HTML de una versión anterior, no es una captura real.*

## Subcomandos

| Comando | Qué hace |
|---|---|
| `/mods` | tabla del pack, avisos y otros plugins instalados |
| `/mods on <nombre>` | ejecuta `claude plugin enable <nombre>` |
| `/mods off <nombre>` | ejecuta `claude plugin disable <nombre>` |
| `/mods actualizar` | muestra los comandos para actualizar el pack y tu copia local; no ejecuta nada |
| `/mods ayuda` | lista los subcomandos |

`/mods update` y `/mods help` también valen. `on` y `off` solo aceptan los nombres del pack: `portero`, `resumen-sesion`, `consumo`, `jarvis-banda` y `mods-estado`; con cualquier otro no ejecutan nada. Su cambio vale desde la próxima sesión.

## Cómo leer la tabla

```
Pack jarvis-essential-pack:
      Mod             Estado           Instalada  Copia local
  ─────────────────────────────────────────────────────────
  [x] portero         activo           0.1.0      0.2.0       ≠
  [!] consumo         falló al cargar  0.4.0      0.4.0
  [ ] jarvis-banda    desactivado      0.2.0      —
```

| Columna | De dónde sale |
|---|---|
| Marca | `[x]` activo · `[ ]` desactivado o no instalado · `[!]` falló al cargar · `[?]` no se pudo leer la lista |
| Estado | `activo`, `desactivado`, `falló al cargar`, `no instalado`, `en uso` (solo mods-estado, cuando no sale en la lista porque lo cargaste con `--plugin-dir`). `(marketplace antiguo)` si viene de `portero-claude` |
| Instalada | la versión que da `claude plugin list` |
| Copia local | la versión del `plugin.json` de ese mod en tu [carpeta del pack](#es-carpeta) (`modsDir`); `—` si no hay copia |
| `≠` | la copia local y la instalada no coinciden |

Debajo salen los demás plugins instalados, qué carpeta se usó como copia local y desde dónde se cargó mods-estado.

La salida es monocroma, como el HUD de consumo: `[x]` y `[ ]` en blanco, `[!]` en blanco y negrita, `[?]` en gris; los encabezados y el separador de la tabla en gris. No hay colores de acento.

## Avisos

Cada aviso empieza por `Aviso:`, sin color.

- **Mod roto:** si un mod del pack falló al cargar, dice cuál con el texto del error y sugiere `claude plugin update <mod>@jarvis-essential-pack`, reinstalarlo o mirar `claude --debug`.
- **Versiones distintas:** si la copia local es más nueva, te da el comando para actualizar la instalada; si es más antigua, te manda a `/mods actualizar`.
- **No cargados:** lista los mods del pack desactivados o sin instalar.
- **Marketplace antiguo:** el pack se llamaba `portero-claude`; ahora es `jarvis-essential-pack`. Si quedan plugins instalados desde `portero-claude` o el marketplace sigue configurado, lo dice y te da los comandos para limpiarlo (`claude plugin uninstall <mod>@portero-claude`, `claude plugin marketplace remove portero-claude`) y para instalar de nuevo desde el actual. **No borra nada**: tú decides si los ejecutas.

## /mods actualizar

Muestra, sin ejecutarlos:

1. Para los mods instalados: `claude plugin marketplace update jarvis-essential-pack` y `claude plugin update <mod>@jarvis-essential-pack` (o cómo instalarlos si no hay ninguno).
2. Para la copia local:
   - si la carpeta `modsDir` es un clon de git del repo: `git -C "<carpeta>" pull`;
   - si no: clonar o actualizar el repo junto a ella (`<carpeta padre>/portero-claude`) y copiar cada mod encima, con `cp -R` (macOS y Linux) o `robocopy ... /E` (Windows). La copia sobrescribe archivos con el mismo nombre y no borra nada.
3. Reiniciar Claude Code.

## Cómo funciona

1. Al iniciar la sesión registra `/mods`.
2. `/mods` ejecuta `claude plugin list --json` (si tu versión no lo admite, `claude plugin list`) y `claude plugin marketplace list --json`. Prueba también `claude.cmd` en Windows.
3. Lee el `plugin.json` de cada mod en la carpeta `modsDir`.
4. Compara y devuelve el informe como texto en la conversación. Solo lee: los únicos comandos que cambian algo son los de `/mods on` y `/mods off`.

## Cómo se instala

```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install mods-estado@jarvis-essential-pack
```

O cárgalo con `--plugin-dir` (ver el [README principal](../README.md#es-cargar)).

## Opciones

| Opción | Valores | Por defecto |
|---|---|---|
| `idioma` | `es` o `en` | `es` |
| `modsDir` | carpeta de tu copia local del pack | `~/CLAUDE/mods` |

<a id="es-carpeta"></a>

### Carpeta del pack (`modsDir`)

Tu copia local del pack (una subcarpeta por mod), la misma que usas con `--plugin-dir`.

- `~` es tu carpeta de usuario: `%USERPROFILE%` en Windows (por ejemplo `C:\Users\<tú>\CLAUDE\mods`), `$HOME` en macOS y Linux.
- Acepta una ruta absoluta o una que empiece por `~`. Una ruta relativa cuenta desde tu carpeta de usuario.
- Si la carpeta no existe, la columna Copia local sale con `—`.

Para verlas o cambiarlas en un mod instalado:

```
claude plugin configure mods-estado@jarvis-essential-pack
echo '{"idioma": "en", "modsDir": "~/CLAUDE/mods"}' | claude plugin configure mods-estado@jarvis-essential-pack --values-stdin
```

También con `/plugin configure mods-estado@jarvis-essential-pack` o en `/config`. Si cargas el mod con `--plugin-dir`, guárdalas en `~/.claude/settings.json`:

```json
{ "pluginConfigs": { "mods-estado": { "options": { "idioma": "es", "modsDir": "~/CLAUDE/mods" } } } }
```

El cambio se aplica al reiniciar Claude Code.

## Límites

- **Los mods cargados con `--plugin-dir` no salen en `claude plugin list`**, así que aparecen como "no instalado" aunque estén en uso. La excepción es el propio mods-estado, que sale como "en uso".
- No instala, actualiza ni borra nada: `/mods actualizar` y el aviso del marketplace antiguo solo muestran comandos.
- `/mods on` y `/mods off` solo sirven con mods instalados; con `--plugin-dir` cambia la lista de la función de PowerShell.
- La columna Copia local depende de que exista `<modsDir>/<mod>/.claude-plugin/plugin.json`.
- Necesita el comando `claude` en el PATH.

## Licencia

MIT © deriva1945-ui. Ver [LICENSE](LICENSE).

---

<a id="en"></a>

# mods-estado (English)

[Español](#es) · **English**

Adds the `/mods` command: a check-up of the `jarvis-essential-pack`. For each mod it tells you whether it is active, which version is installed, which version your local copy has and whether any failed to load. It warns about leftovers from the old `portero-claude` marketplace and gives you the commands to update, without running anything on its own.

Set the `idioma` option to `en` for English output.

![/mods output](../images/mods-terminal.png)

*HTML example of an earlier version, not a real screenshot.*

## Subcommands

| Command | What it does |
|---|---|
| `/mods` | pack table, warnings and other installed plugins |
| `/mods on <name>` | runs `claude plugin enable <name>` |
| `/mods off <name>` | runs `claude plugin disable <name>` |
| `/mods update` | shows the commands to update the pack and your local copy; runs nothing |
| `/mods help` | lists the subcommands |

`/mods actualizar` and `/mods ayuda` work too. `on` and `off` only accept the pack names: `portero`, `resumen-sesion`, `consumo`, `jarvis-banda` and `mods-estado`; with any other they run nothing. Their change applies from the next session.

## Reading the table

```
Pack jarvis-essential-pack:
      Mod             State           Installed  Local copy
  ─────────────────────────────────────────────────────────
  [x] portero         active          0.1.0      0.2.0       ≠
  [!] consumo         failed to load  0.4.0      0.4.0
  [ ] jarvis-banda    disabled        0.2.0      —
```

| Column | Where it comes from |
|---|---|
| Mark | `[x]` active · `[ ]` disabled or not installed · `[!]` failed to load · `[?]` the list could not be read |
| State | `active`, `disabled`, `failed to load`, `not installed`, `in use` (only mods-estado, when it is not in the list because you loaded it with `--plugin-dir`). `(old marketplace)` if it comes from `portero-claude` |
| Installed | the version `claude plugin list` reports |
| Local copy | the version in that mod's `plugin.json` in your [pack folder](#en-folder) (`modsDir`); `—` if there is no copy |
| `≠` | the local copy and the installed one differ |

Below it come the other installed plugins, the folder used as the local copy and where mods-estado was loaded from.

The output is monochrome, like the usage HUD: `[x]` and `[ ]` in white, `[!]` in bold white, `[?]` in grey; headings and the table separator in grey. There are no accent colors.

## Warnings

Each warning starts with `Warning:`, with no color.

- **Broken mod:** if a pack mod failed to load, it names it with the error text and suggests `claude plugin update <mod>@jarvis-essential-pack`, reinstalling it or checking `claude --debug`.
- **Different versions:** if the local copy is newer, it gives you the command to update the installed one; if it is older, it points you to `/mods update`.
- **Not loaded:** lists the pack mods that are disabled or not installed.
- **Old marketplace:** the pack used to be called `portero-claude`; it is now `jarvis-essential-pack`. If plugins installed from `portero-claude` remain, or that marketplace is still configured, it says so and gives you the commands to clean up (`claude plugin uninstall <mod>@portero-claude`, `claude plugin marketplace remove portero-claude`) and to install again from the current one. **It deletes nothing**: you decide whether to run them.

## /mods update

Shows, without running them:

1. For installed mods: `claude plugin marketplace update jarvis-essential-pack` and `claude plugin update <mod>@jarvis-essential-pack` (or how to install them if there are none).
2. For the local copy:
   - if the `modsDir` folder is a git clone of the repo: `git -C "<folder>" pull`;
   - otherwise: clone or update the repo next to it (`<parent folder>/portero-claude`) and copy each mod over it, with `cp -R` (macOS and Linux) or `robocopy ... /E` (Windows). The copy overwrites files with the same name and deletes nothing.
3. Restart Claude Code.

## How it works

1. When the session starts it registers `/mods`.
2. `/mods` runs `claude plugin list --json` (or `claude plugin list` if your version lacks it) and `claude plugin marketplace list --json`. It also tries `claude.cmd` on Windows.
3. It reads each mod's `plugin.json` in the `modsDir` folder.
4. It compares and returns the report as text in the conversation. It only reads: the only commands that change anything are those of `/mods on` and `/mods off`.

## Install

```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install mods-estado@jarvis-essential-pack
```

Or load it with `--plugin-dir` (see the [main README](../README.md#en-load)).

## Options

| Option | Values | Default |
|---|---|---|
| `idioma` | `es` or `en` | `es` |
| `modsDir` | the folder of your local copy of the pack | `~/CLAUDE/mods` |

<a id="en-folder"></a>

### Pack folder (`modsDir`)

Your local copy of the pack (one subfolder per mod), the same one you use with `--plugin-dir`.

- `~` is your user folder: `%USERPROFILE%` on Windows (for example `C:\Users\<you>\CLAUDE\mods`), `$HOME` on macOS and Linux.
- It takes an absolute path or one starting with `~`. A relative path counts from your user folder.
- If the folder does not exist, the Local copy column shows `—`.

To see or change them for an installed mod:

```
claude plugin configure mods-estado@jarvis-essential-pack
echo '{"idioma": "en", "modsDir": "~/CLAUDE/mods"}' | claude plugin configure mods-estado@jarvis-essential-pack --values-stdin
```

Also with `/plugin configure mods-estado@jarvis-essential-pack` or in `/config`. If you load the mod with `--plugin-dir`, save them in `~/.claude/settings.json`:

```json
{ "pluginConfigs": { "mods-estado": { "options": { "idioma": "en", "modsDir": "~/CLAUDE/mods" } } } }
```

The change applies when you restart Claude Code.

## Limits

- **Mods loaded with `--plugin-dir` do not show in `claude plugin list`**, so they appear as "not installed" even when in use. The exception is mods-estado itself, shown as "in use".
- It installs, updates and deletes nothing: `/mods update` and the old-marketplace warning only show commands.
- `/mods on` and `/mods off` only work with installed mods; with `--plugin-dir`, edit the list in the PowerShell function.
- The Local copy column needs `<modsDir>/<mod>/.claude-plugin/plugin.json` to exist.
- It needs the `claude` command on your PATH.

## License

MIT © deriva1945-ui. See [LICENSE](LICENSE).
