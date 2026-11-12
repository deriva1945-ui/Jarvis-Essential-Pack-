# mods-estado

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
