# portero

**Español** · [English](#english)

Mod para Claude Code que mira cada petición antes de responder y decide quién la hace.

![Cómo reparte portero](../images/portero-diagrama.png)

## Qué hace

- **Ligera** (traducir, dar formato, preguntas cortas): la responde el modelo de la sesión, sin subagentes.
- **Pesada** (arquitectura, depurar, analizar, varios archivos): se delega a un subagente con Opus. El subagente recibe los últimos mensajes como contexto.
- **Dudosa**: va por la ruta pesada.

Primero aplica reglas sencillas: longitud del texto, bloques de código, palabras clave y nombres de archivo. Solo si las reglas no deciden, pregunta a Haiku.

Atajos:
- `!pesada ...` fuerza la ruta pesada.
- `!ligera ...` fuerza la ruta ligera.

Para usar otro modelo en lo pesado, cambia `HEAVY_MODEL` en `hooks/register.tsx` (`opus` o `fable`).

## Instalación

```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install portero@jarvis-essential-pack
```

## Qué no hace

- No cambia el modelo del hilo principal. Si la sesión usa Opus, lo ligero también va con Opus. Para ahorrar, pon la sesión en Haiku con `/model`.
- El subagente solo ve los últimos 4 mensajes, no todo el historial.
- La clasificación puede fallar. Si no estás de acuerdo, usa los atajos.

## Licencia

MIT. Ver [LICENSE](LICENSE).

---

<a id="english"></a>

# portero (English)

A Claude Code mod that looks at each request before answering and decides who handles it.

![How portero routes work](../images/portero-diagrama.png)

## What it does

- **Light** (translate, format, short questions): the session model answers, with no subagents.
- **Heavy** (architecture, debugging, analysis, several files): handed to an Opus subagent. The subagent gets the latest messages as context.
- **Unsure**: takes the heavy route.

It first applies simple rules: text length, code blocks, keywords and file names. Only when the rules cannot decide does it ask Haiku.

Shortcuts:
- `!pesada ...` forces the heavy route.
- `!ligera ...` forces the light route.

To use another model for heavy work, change `HEAVY_MODEL` in `hooks/register.tsx` (`opus` or `fable`).

## Install

```
/plugin marketplace add deriva1945-ui/portero-claude
/plugin install portero@jarvis-essential-pack
```

## What it does not do

- It does not change the main thread's model. If the session runs on Opus, light work also runs on Opus. To save, switch the session to Haiku with `/model`.
- The subagent only sees the last 4 messages, not the full history.
- The classification can be wrong. If you disagree, use the shortcuts.

## License

MIT. See [LICENSE](LICENSE).
