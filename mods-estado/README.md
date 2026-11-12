<a id="es"></a>

# mods-estado

**Español** · [English](#en)

Añade el comando `/mods`: te dice qué plugins están activos y qué mods del pack faltan.

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

- Dice si existe la carpeta `C:\CLAUDE\mods` y qué mods tienen copia allí.
- Si `claude` no está en el PATH o el comando falla, lo explica en vez de romperse.

## Cómo funciona

1. Al **iniciar la sesión** registra el comando `/mods`.
2. Al escribir `/mods`, **ejecuta `claude plugin list`** (y prueba `claude.cmd` en Windows si hace falta).
3. Lee la salida línea a línea: nombre, origen, versión y estado de cada plugin.
4. **Compara con el pack:** busca `portero`, `resumen-sesion`, `consumo` y `jarvis-banda` y marca cada uno.
5. Mira si hay copia local en `C:\CLAUDE\mods` y desde qué carpeta se cargó el propio mods-estado.
6. Devuelve todo como texto en la conversación.

## Cómo se instala

```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install mods-estado@jarvis-essential-pack
```

O cárgalo con `--plugin-dir` (ver el [README principal](../README.md#es-cargar)). Luego escribe `/mods`.

## Qué no hace / límites

- No ve los mods cargados con `--plugin-dir`: salen como "no cargado" aunque estén en uso.
- No activa ni instala nada: solo informa.
- `C:\CLAUDE\mods` es una ruta de Windows. En otros sistemas sale "sin copia local".
- Necesita el comando `claude` en el PATH.

## Licencia

MIT © deriva1945-ui. Ver [LICENSE](LICENSE).

---

<a id="en"></a>

# mods-estado (English)

[Español](#es) · **English**

Adds the `/mods` command: it tells you which plugins are active and which pack mods are missing.

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

- Says whether the `C:\CLAUDE\mods` folder exists and which mods have a copy there.
- If `claude` is not on the PATH or the command fails, it explains instead of breaking.

## How it works

1. When **the session starts** it registers the `/mods` command.
2. When you type `/mods`, it **runs `claude plugin list`** (and tries `claude.cmd` on Windows if needed).
3. It reads the output line by line: name, source, version and state of each plugin.
4. **It compares with the pack:** it looks for `portero`, `resumen-sesion`, `consumo` and `jarvis-banda` and marks each one.
5. It checks for a local copy in `C:\CLAUDE\mods` and which folder mods-estado itself was loaded from.
6. It returns everything as text in the conversation.

## Install

```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install mods-estado@jarvis-essential-pack
```

Or load it with `--plugin-dir` (see the [main README](../README.md#en-load)). Then type `/mods`.

## What it does not do / limits

- It cannot see mods loaded with `--plugin-dir`: they show as "not loaded" even when in use.
- It does not enable or install anything: it only reports.
- `C:\CLAUDE\mods` is a Windows path. On other systems it shows "sin copia local" (no local copy).
- It needs the `claude` command on your PATH.

## License

MIT © deriva1945-ui. See [LICENSE](LICENSE).
