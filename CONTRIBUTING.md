<a id="es"></a>

# Contribuir · Contributing

**Español** · [English](#en)

¡Gracias por querer ayudar! Este pack es pequeño y se mantiene en ratos libres. Cambios pequeños y claros se revisan antes.

## Cómo proponer un cambio

1. **Abre un issue primero** si el cambio es grande (un mod nuevo, cambiar cómo funciona uno). Para erratas o arreglos pequeños, ve directo al pull request.
2. Haz un fork y crea una rama desde la rama por defecto.
3. Toca **un solo mod por pull request** si puedes.
4. Si cambias lo que hace un mod, actualiza su `README.md` (español e inglés) y [CHANGELOG.md](CHANGELOG.md).
5. Abre el pull request y rellena la plantilla.

## Cómo probar un mod

Desde la raíz del repo:

```
claude plugin validate .
claude plugin validate ./<mod>
claude plugin test ./<mod>
```

- `validate .` revisa el marketplace. `validate ./<mod>` revisa el `plugin.json` y los hooks del mod.
- `test ./<mod>` corre los tests `*.test.tsx` del mod (hoy los tienen `consumo`, `jarvis-banda` y `mods-estado`).
- Para verlo en uso, abre Claude Code con `claude --plugin-dir ./<mod>`.

Si añades lógica nueva, añade un test.

## Estilo

- **Commits** en español o en inglés, en imperativo y cortos. Ejemplo: `Consumo: avisar al 85 % de contexto` o `Fix /mods when claude is not on PATH`.
- **Textos** de los mods en español; READMEs en español e inglés.
- Frases cortas. Sin jerga si no hace falta.

## Sin datos personales

No incluyas en código, tests, capturas ni commits:

- correos, nombres reales, rutas de tu equipo (como tu carpeta de usuario),
- tokens, claves de API ni contraseñas,
- trozos de conversaciones privadas.

Usa ejemplos inventados. Las capturas, mejor recreadas en HTML.

## Normas

Este proyecto sigue el [Código de conducta](CODE_OF_CONDUCT.md). Para fallos de seguridad, lee [SECURITY.md](SECURITY.md) y **no** abras un issue público.

---

<a id="en"></a>

## English

[Español](#es) · **English**

Thanks for wanting to help! This pack is small and maintained in spare time. Small, clear changes get reviewed sooner.

### How to propose a change

1. **Open an issue first** for big changes (a new mod, changing how one works). For typos or small fixes, go straight to a pull request.
2. Fork the repo and create a branch from the default branch.
3. Touch **one mod per pull request** if you can.
4. If you change what a mod does, update its `README.md` (Spanish and English) and [CHANGELOG.md](CHANGELOG.md).
5. Open the pull request and fill in the template.

### How to test a mod

From the repo root:

```
claude plugin validate .
claude plugin validate ./<mod>
claude plugin test ./<mod>
```

- `validate .` checks the marketplace. `validate ./<mod>` checks the mod's `plugin.json` and hooks.
- `test ./<mod>` runs the mod's `*.test.tsx` tests (today `consumo`, `jarvis-banda` and `mods-estado` have them).
- To see it in use, start Claude Code with `claude --plugin-dir ./<mod>`.

If you add new logic, add a test.

### Style

- **Commits** in Spanish or English, imperative and short. Example: `Consumo: avisar al 85 % de contexto` or `Fix /mods when claude is not on PATH`.
- Mod **labels** in Spanish; READMEs in Spanish and English.
- Short sentences. No jargon unless needed.

### No personal data

Do not include in code, tests, screenshots or commits:

- emails, real names, paths from your machine (like your user folder),
- tokens, API keys or passwords,
- pieces of private conversations.

Use made-up examples. Screenshots are best recreated in HTML.

### Rules

This project follows the [Code of conduct](CODE_OF_CONDUCT.md). For security bugs, read [SECURITY.md](SECURITY.md) and do **not** open a public issue.
