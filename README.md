# jarvis-essential-pack

![jarvis-essential-pack](images/banner.png)

**Español** · [English](#english)

Cinco mods para Claude Code con estilo J.A.R.V.I.S.: reparten el trabajo entre modelos, muestran el consumo y te dicen en qué está la sesión.

## Los mods

| Mod | Qué hace | Captura |
|---|---|---|
| [portero](portero/) | Decide si cada petición es ligera o pesada. Lo ligero lo hace el modelo de la sesión; lo pesado va a un subagente Opus. | ![portero](images/portero-diagrama.png) |
| [resumen-sesion](resumen-sesion/) | Si vuelves tras 2 horas sin escribir, crea un resumen del trabajo con Haiku para seguir en una sesión nueva. | ![resumen-sesion](images/resumen-terminal.png) |
| [consumo](consumo/) | Abre una ventana HUD con el contexto usado, el coste y los tokens por agente y por modelo. | ![consumo](images/consumo-900x600.png) |
| [jarvis-banda](jarvis-banda/) | Una línea encima del prompt con el estado en vivo: esperando, procesando, ejecutando o delegando. | ![jarvis-banda](images/banda-delegando.png) |
| [mods-estado](mods-estado/) | Añade el comando `/mods`: lista los plugins activos y marca los del pack. | ![mods-estado](images/mods-terminal.png) |

## Instalación

Dentro de Claude Code, en dos pasos:

```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install <mod>@jarvis-essential-pack
```

Cambia `<mod>` por el nombre del mod. Por ejemplo: `/plugin install consumo@jarvis-essential-pack`. Repite el segundo paso para cada mod que quieras.

## Requisitos

- Claude Code con soporte de mods de terminal (plugins con `hooks/register.tsx`).
- Para el HUD de `consumo`: Windows con Edge o Chrome. La ventana se abre en modo aplicación (`--app`).
- `mods-estado` necesita que el comando `claude` esté en el PATH.

## Cargar los mods en cada sesión (sin instalarlos)

Si prefieres tener los mods en una carpeta propia, por ejemplo `C:\CLAUDE\mods`, Claude Code los carga con la opción `--plugin-dir`. Una carpeta por mod.

1. Copia las carpetas `portero`, `resumen-sesion`, `consumo`, `jarvis-banda` y `mods-estado` de este repo en `C:\CLAUDE\mods`.
2. Abre tu perfil de PowerShell con `notepad $PROFILE` y pega esta función:

```powershell
# Abre Claude Code con todos los mods del pack cargados.
function claude {
    $exe  = (Get-Command claude -CommandType Application | Select-Object -First 1).Source
    $mods = 'C:\CLAUDE\mods'
    $dirs = 'portero', 'resumen-sesion', 'consumo', 'jarvis-banda', 'mods-estado' |
        ForEach-Object { '--plugin-dir'; Join-Path $mods $_ }
    & $exe @dirs @args
}
```

3. Abre una ventana nueva de PowerShell y escribe `claude`. Los mods se cargan solos.

La función busca el `claude` real (el programa, no la función) para no llamarse a sí misma. No mezcles los dos métodos: si instalas un mod con `/plugin install`, quítalo de la lista de la función.

## Limitaciones conocidas

- **Sin audio en Windows.** Los mods no reproducen sonidos ni voz en Windows.
- **portero no cambia el modelo del hilo principal.** Si la sesión usa Opus, lo ligero también va con Opus. Para ahorrar, pon la sesión en Haiku con `/model`.
- **El HUD de consumo no se ha probado en todos los PC.** Puede variar con la versión de Windows, del navegador o con el escalado de pantalla.
- `mods-estado` no ve los mods cargados con `--plugin-dir`: aparecen como "no cargado" aunque estén en uso.

## Licencia

MIT. Autor: deriva1945-ui. Ver [LICENSE](LICENSE).

---

<a id="english"></a>

# jarvis-essential-pack (English)

[Español](#jarvis-essential-pack) · **English**

Five J.A.R.V.I.S.-style mods for Claude Code: they split work between models, show what you spend, and tell you what the session is doing.

## The mods

| Mod | What it does | Screenshot |
|---|---|---|
| [portero](portero/) | Decides if each request is light or heavy. Light work stays on the session model; heavy work goes to an Opus subagent. | ![portero](images/portero-diagrama.png) |
| [resumen-sesion](resumen-sesion/) | When you come back after 2 hours without typing, Haiku writes a handover summary so you can continue in a new session. | ![resumen-sesion](images/resumen-terminal.png) |
| [consumo](consumo/) | Opens a HUD window with context used, cost, and tokens per agent and per model. | ![consumo](images/consumo-900x600.png) |
| [jarvis-banda](jarvis-banda/) | One line above the prompt with the live state: waiting, processing, running a tool, or delegating. | ![jarvis-banda](images/banda-delegando.png) |
| [mods-estado](mods-estado/) | Adds the `/mods` command: lists active plugins and marks the ones from this pack. | ![mods-estado](images/mods-terminal.png) |

The mods speak Spanish in the terminal (labels like "ESPERANDO ÓRDENES" = "awaiting orders").

## Install

Inside Claude Code, in two steps:

```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install <mod>@jarvis-essential-pack
```

Replace `<mod>` with the mod name. For example: `/plugin install consumo@jarvis-essential-pack`. Repeat the second step for each mod you want.

## Requirements

- Claude Code with terminal mod support (plugins with `hooks/register.tsx`).
- For the `consumo` HUD: Windows with Edge or Chrome. The window opens in app mode (`--app`).
- `mods-estado` needs the `claude` command on your PATH.

## Load the mods in every session (without installing them)

If you keep the mods in your own folder, for example `C:\CLAUDE\mods`, Claude Code loads them with the `--plugin-dir` option. One folder per mod.

1. Copy the `portero`, `resumen-sesion`, `consumo`, `jarvis-banda` and `mods-estado` folders from this repo into `C:\CLAUDE\mods`.
2. Open your PowerShell profile with `notepad $PROFILE` and paste this function:

```powershell
# Starts Claude Code with every mod of the pack loaded.
function claude {
    $exe  = (Get-Command claude -CommandType Application | Select-Object -First 1).Source
    $mods = 'C:\CLAUDE\mods'
    $dirs = 'portero', 'resumen-sesion', 'consumo', 'jarvis-banda', 'mods-estado' |
        ForEach-Object { '--plugin-dir'; Join-Path $mods $_ }
    & $exe @dirs @args
}
```

3. Open a new PowerShell window and type `claude`. The mods load on their own.

The function looks up the real `claude` program (not the function) so it does not call itself. Do not mix both methods: if you install a mod with `/plugin install`, remove it from the function's list.

## Known limitations

- **No audio on Windows.** The mods do not play sounds or voice on Windows.
- **portero does not change the main thread's model.** If the session runs on Opus, light work also runs on Opus. To save, switch the session to Haiku with `/model`.
- **The consumo HUD has not been tested on every PC.** It may vary with the Windows version, the browser, or display scaling.
- `mods-estado` cannot see mods loaded with `--plugin-dir`: they show as "not loaded" even when in use.

## License

MIT. Author: deriva1945-ui. See [LICENSE](LICENSE).
