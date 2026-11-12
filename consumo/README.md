# consumo

HUD de consumo para Claude Code en una ventana aparte: contexto usado con su porcentaje, coste acumulado de la sesión y tokens por agente y por modelo. Se abre al iniciar la sesión (Edge o Chrome en modo `--app`, desde `C:\CLAUDE\consumo\index.html`). El coste sale del contador de la sesión, así que no hay tabla de precios por agente.

La ventana muestra además el reparto del trabajo entre modelos (Haiku, Opus y el de la sesión principal), una gráfica de tokens por turno, los últimos 20 turnos, alertas cuando el contexto pasa del 70 % y del 85 %, y un aviso de "sin señal" si `datos.js` deja de actualizarse durante 10 segundos. Funciona sin conexión: todo va dentro de la página.

Se adapta al tamaño de la ventana: rejilla completa desde 1600 px de ancho, dos columnas sin la gráfica entre 900 y 1599 px, y una sola columna por debajo de 900 px (mínimo 420 px). La tecla `D` o el botón de la cabecera alterna entre modo cómodo y compacto; la preferencia se guarda en el navegador.
