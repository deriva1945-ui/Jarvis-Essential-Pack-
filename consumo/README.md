# consumo

Panel en directo para Claude Code: contexto usado con su porcentaje, coste acumulado de la sesión y tokens de entrada, salida y caché por agente y por modelo. Se abre al iniciar la sesión o con el comando `/consumo`. El coste sale del contador de la sesión, así que no hay tabla de precios por agente.

La ventana aparte (estilo HUD) muestra además el reparto del trabajo entre modelos (Haiku, Opus y el de la sesión principal), una gráfica de tokens por turno, los últimos 20 turnos con su modelo y lo que subió el coste en cada uno, alertas cuando el contexto pasa del 70 % y del 85 %, y un aviso de "sin señal" si `datos.js` deja de actualizarse durante 10 segundos. Funciona sin conexión: todo va dentro de la página.
