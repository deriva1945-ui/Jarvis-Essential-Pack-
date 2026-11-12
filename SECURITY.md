<a id="es"></a>

# Seguridad · Security

**Español** · [English](#en)

## Versiones con soporte

Solo la última versión publicada de cada mod recibe arreglos.

## Cómo avisar de una vulnerabilidad

**No abras un issue público ni publiques detalles.**

1. Usa el aviso privado de GitHub: pestaña **Security** del repositorio → **Report a vulnerability**. Solo lo ve el mantenedor.
2. Si esa opción no aparece, abre un issue con el título "Contacto de seguridad" **sin ningún detalle** y pide un canal privado. El mantenedor te responderá con un correo o un aviso privado.

Incluye, por el canal privado:

- qué mod y qué versión,
- qué puede pasar (por ejemplo, ejecutar algo, leer o escribir archivos que no debe),
- pasos para reproducirlo.

## Qué esperar

- Respuesta inicial en unos 7 días.
- Te avisaremos cuando haya un arreglo y, si quieres, se te citará en el [CHANGELOG](CHANGELOG.md).
- Pedimos no publicar nada hasta que el arreglo esté disponible.

## Qué tocan los mods

Para valorar el riesgo:

- `consumo` escribe en `C:\CLAUDE\consumo` (la página, `datos.js`, `estado.json` y `estado.js`) y abre Edge o Chrome. `/jarvis` no cierra procesos: solo cambia `estado.json`.
- `mods-estado` ejecuta `claude plugin list` y lee `C:\CLAUDE\mods`. Con `/mods on` y `/mods off` ejecuta `claude plugin enable` o `claude plugin disable`, solo con nombres del pack.
- `portero` y `resumen-sesion` envían texto de la conversación a un modelo de Claude, dentro de la misma sesión.
- Ningún mod envía datos a servidores de terceros.

---

<a id="en"></a>

## English

[Español](#es) · **English**

### Supported versions

Only the latest published version of each mod gets fixes.

### How to report a vulnerability

**Do not open a public issue or publish details.**

1. Use GitHub's private reporting: the repository's **Security** tab → **Report a vulnerability**. Only the maintainer sees it.
2. If that option is missing, open an issue titled "Security contact" **with no details** and ask for a private channel. The maintainer will reply with an email or a private advisory.

Through the private channel, include:

- which mod and which version,
- what can happen (for example, running something, reading or writing files it should not),
- steps to reproduce it.

### What to expect

- First reply in about 7 days.
- We will tell you when a fix is ready and, if you want, credit you in the [CHANGELOG](CHANGELOG.md).
- Please do not publish anything until the fix is available.

### What the mods touch

To help you judge the risk:

- `consumo` writes to `C:\CLAUDE\consumo` (the page, `datos.js`, `estado.json` and `estado.js`) and opens Edge or Chrome. `/jarvis` does not kill processes: it only changes `estado.json`.
- `mods-estado` runs `claude plugin list` and reads `C:\CLAUDE\mods`. With `/mods on` and `/mods off` it runs `claude plugin enable` or `claude plugin disable`, only with pack names.
- `portero` and `resumen-sesion` send conversation text to a Claude model, inside the same session.
- No mod sends data to third-party servers.
