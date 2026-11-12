<a id="top"></a>

![jarvis-essential-pack](images/banner.png)

<p align="center"><b>Cinco mods para Claude Code con estilo J.A.R.V.I.S.: reparten el trabajo entre modelos, muestran el consumo y te dicen en qué está la sesión.</b></p>

<p align="center">
  <a href="LICENSE"><img alt="Licencia MIT" src="https://img.shields.io/badge/licencia-MIT-22d3ee"></a>
  <a href="https://docs.claude.com/en/docs/claude-code"><img alt="Claude Code" src="https://img.shields.io/badge/Claude%20Code-mods-d97757"></a>
  <img alt="Versión 0.1.0" src="https://img.shields.io/badge/versi%C3%B3n-0.1.0-64748b">
  <a href="CONTRIBUTING.md"><img alt="Contribuciones bienvenidas" src="https://img.shields.io/badge/contribuciones-bienvenidas-34d399"></a>
</p>

<p align="center"><b>Español</b> · <a href="#en">English</a></p>

---

<a id="es"></a>

## Índice

- [Los mods](#es-mods)
- [Instalación](#es-instalacion)
- [Cargar los mods en cada sesión](#es-cargar)
- [Cómo funciona por dentro](#es-funciona)
- [Requisitos](#es-requisitos)
- [Limitaciones conocidas](#es-limites)
- [Contribuir](#es-contribuir)
- [Licencia](#es-licencia)

<a id="es-mods"></a>

## Los mods

| Mod | Qué hace | Imagen |
|---|---|---|
| **[portero](portero/)** | Mira cada petición y decide quién la hace. Lo ligero, el modelo de la sesión. Lo pesado, un subagente Opus. | <img src="images/portero-diagrama.png" alt="portero" width="280"> |
| **[resumen-sesion](resumen-sesion/)** | Si vuelves tras 2 horas sin escribir, Haiku escribe un resumen de traspaso para seguir en una sesión nueva. | <img src="images/resumen-terminal.png" alt="resumen-sesion" width="280"> |
| **[consumo](consumo/)** | Ventana HUD en directo: contexto usado, coste y tokens por agente y por modelo. | <img src="images/consumo-900x600.png" alt="consumo" width="280"> |
| **[jarvis-banda](jarvis-banda/)** | Una línea encima del prompt con el estado en vivo: esperando, procesando, ejecutando o delegando. | <img src="images/banda-delegando.png" alt="jarvis-banda" width="280"> |
| **[mods-estado](mods-estado/)** | Comando `/mods`: lista los plugins activos y marca los del pack. | <img src="images/mods-terminal.png" alt="mods-estado" width="280"> |

Cada mod es independiente. Instala solo los que quieras.

<a id="es-instalacion"></a>

## Instalación

Dentro de Claude Code, en dos pasos:

**1. Añade el marketplace** (una sola vez):

```
/plugin marketplace add deriva1945-ui/portero-claude
```

**2. Instala cada mod que quieras:**

```
/plugin install <mod>@jarvis-essential-pack
```

Cambia `<mod>` por `portero`, `resumen-sesion`, `consumo`, `jarvis-banda` o `mods-estado`.
Ejemplo: `/plugin install consumo@jarvis-essential-pack`.

<a id="es-cargar"></a>

## Cargar los mods en cada sesión

Otra opción, sin instalar: guarda los mods en una carpeta tuya y Claude Code los carga con `--plugin-dir`.

### Copia local en `C:\CLAUDE\mods`

1. Copia las carpetas `portero`, `resumen-sesion`, `consumo`, `jarvis-banda` y `mods-estado` de este repo en `C:\CLAUDE\mods`. Una carpeta por mod.
2. Abre tu perfil de PowerShell con `notepad $PROFILE`.
3. Pega la función de abajo y guarda.
4. Abre una ventana nueva de PowerShell y escribe `claude`. Los mods se cargan solos.

### Función de PowerShell

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

> [!TIP]
> La función busca el programa `claude` real, no la función, para no llamarse a sí misma.

> [!WARNING]
> No mezcles los dos métodos. Si instalas un mod con `/plugin install`, quítalo de la lista de la función.

<a id="es-funciona"></a>

## Cómo funciona por dentro

Todos los mods siguen el mismo camino: **eventos → hooks → datos → pantalla**.

| Paso | Qué pasa |
|---|---|
| **Eventos** | Claude Code avisa de lo que ocurre: empieza la sesión, envías un mensaje, corre una herramienta, nace un subagente, termina un turno. |
| **Hooks** | Cada mod escucha solo los eventos que necesita (`hooks/register.tsx`). |
| **Datos** | El mod guarda un estado pequeño: la hora del último turno, los tokens, el estado de la banda… |
| **Pantalla** | El resultado se ve en una línea, un aviso, una ventana HUD o una respuesta. |

Más detalle y un diagrama en [docs/como-funciona.md](docs/como-funciona.md).

<a id="es-requisitos"></a>

## Requisitos

- Claude Code con soporte de mods de terminal (plugins con `hooks/register.tsx`).
- `consumo`: Windows con Edge o Chrome. La ventana se abre en modo aplicación (`--app`).
- `mods-estado`: el comando `claude` en el PATH.

<a id="es-limites"></a>

## Limitaciones conocidas

- **Sin audio en Windows.** Los mods no reproducen sonidos ni voz.
- **portero no cambia el modelo del hilo principal.** Si la sesión usa Opus, lo ligero también va con Opus. Para ahorrar, pon la sesión en Haiku con `/model`.
- **El HUD de consumo no se ha probado en todos los PC.** Puede variar con la versión de Windows, el navegador o el escalado de pantalla.
- **mods-estado no ve los mods cargados con `--plugin-dir`.** Salen como "no cargado" aunque estén en uso.
- **Textos en español.** Lo que los mods muestran en la terminal está en español.

<a id="es-contribuir"></a>

## Contribuir

¿Ideas, fallos o mejoras? Lee [CONTRIBUTING.md](CONTRIBUTING.md).

- [Código de conducta](CODE_OF_CONDUCT.md)
- [Seguridad](SECURITY.md): cómo avisar de una vulnerabilidad sin publicarla.
- [Historial de cambios](CHANGELOG.md)

<a id="es-licencia"></a>

## Licencia

MIT © deriva1945-ui. Ver [LICENSE](LICENSE). Cada mod lleva también su propio `LICENSE`.

<p align="right"><a href="#top">↑ Arriba</a></p>

---

<a id="en"></a>

<p align="center"><a href="#es">Español</a> · <b>English</b></p>

<p align="center"><b>Five J.A.R.V.I.S.-style mods for Claude Code: they split work between models, show what you spend, and tell you what the session is doing.</b></p>

## Contents

- [The mods](#en-mods)
- [Install](#en-install)
- [Load the mods in every session](#en-load)
- [How it works inside](#en-how)
- [Requirements](#en-requirements)
- [Known limitations](#en-limits)
- [Contributing](#en-contributing)
- [License](#en-license)

<a id="en-mods"></a>

## The mods

| Mod | What it does | Image |
|---|---|---|
| **[portero](portero/)** | Looks at each request and decides who handles it. Light work: the session model. Heavy work: an Opus subagent. | <img src="images/portero-diagrama.png" alt="portero" width="280"> |
| **[resumen-sesion](resumen-sesion/)** | When you come back after 2 hours without typing, Haiku writes a handover summary so you can continue in a new session. | <img src="images/resumen-terminal.png" alt="resumen-sesion" width="280"> |
| **[consumo](consumo/)** | Live HUD window: context used, cost, and tokens per agent and per model. | <img src="images/consumo-900x600.png" alt="consumo" width="280"> |
| **[jarvis-banda](jarvis-banda/)** | One line above the prompt with the live state: waiting, processing, running a tool, or delegating. | <img src="images/banda-delegando.png" alt="jarvis-banda" width="280"> |
| **[mods-estado](mods-estado/)** | `/mods` command: lists active plugins and marks the ones from this pack. | <img src="images/mods-terminal.png" alt="mods-estado" width="280"> |

Each mod works on its own. Install only the ones you want.

<a id="en-install"></a>

## Install

Inside Claude Code, in two steps:

**1. Add the marketplace** (once):

```
/plugin marketplace add deriva1945-ui/portero-claude
```

**2. Install each mod you want:**

```
/plugin install <mod>@jarvis-essential-pack
```

Replace `<mod>` with `portero`, `resumen-sesion`, `consumo`, `jarvis-banda` or `mods-estado`.
Example: `/plugin install consumo@jarvis-essential-pack`.

<a id="en-load"></a>

## Load the mods in every session

Another option, without installing: keep the mods in your own folder and Claude Code loads them with `--plugin-dir`.

### Local copy in `C:\CLAUDE\mods`

1. Copy the `portero`, `resumen-sesion`, `consumo`, `jarvis-banda` and `mods-estado` folders from this repo into `C:\CLAUDE\mods`. One folder per mod.
2. Open your PowerShell profile with `notepad $PROFILE`.
3. Paste the function below and save.
4. Open a new PowerShell window and type `claude`. The mods load on their own.

### PowerShell function

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

> [!TIP]
> The function looks up the real `claude` program, not the function, so it does not call itself.

> [!WARNING]
> Do not mix both methods. If you install a mod with `/plugin install`, remove it from the function's list.

<a id="en-how"></a>

## How it works inside

Every mod follows the same path: **events → hooks → data → screen**.

| Step | What happens |
|---|---|
| **Events** | Claude Code reports what happens: the session starts, you send a message, a tool runs, a subagent starts, a turn ends. |
| **Hooks** | Each mod listens only to the events it needs (`hooks/register.tsx`). |
| **Data** | The mod keeps a small state: the time of the last turn, token counts, the band's state… |
| **Screen** | The result shows up as a line, a notice, a HUD window or a reply. |

More detail and a diagram in [docs/how-it-works.md](docs/how-it-works.md).

<a id="en-requirements"></a>

## Requirements

- Claude Code with terminal mod support (plugins with `hooks/register.tsx`).
- `consumo`: Windows with Edge or Chrome. The window opens in app mode (`--app`).
- `mods-estado`: the `claude` command on your PATH.

<a id="en-limits"></a>

## Known limitations

- **No audio on Windows.** The mods play no sounds or voice.
- **portero does not change the main thread's model.** If the session runs on Opus, light work also runs on Opus. To save, switch the session to Haiku with `/model`.
- **The consumo HUD has not been tested on every PC.** It may vary with the Windows version, the browser or display scaling.
- **mods-estado cannot see mods loaded with `--plugin-dir`.** They show as "not loaded" even when in use.
- **Spanish labels.** What the mods show in the terminal is in Spanish.

<a id="en-contributing"></a>

## Contributing

Ideas, bugs or improvements? Read [CONTRIBUTING.md](CONTRIBUTING.md).

- [Code of conduct](CODE_OF_CONDUCT.md)
- [Security](SECURITY.md): how to report a vulnerability without making it public.
- [Changelog](CHANGELOG.md)

<a id="en-license"></a>

## License

MIT © deriva1945-ui. See [LICENSE](LICENSE). Each mod also ships its own `LICENSE`.

<p align="right"><a href="#top">↑ Top</a></p>
