# resumen-sesion

Mod para Claude Code que, cuando vuelves a una sesión tras un rato sin escribir (por defecto 2 horas), genera con Haiku un resumen de traspaso del trabajo: objetivo, decisiones, archivos tocados y pendiente.

El resumen entra en el contexto del turno actual. Para ahorrar tokens de verdad, conviene abrir una sesión nueva con ese resumen en lugar de seguir en la vieja, porque el historial completo se vuelve a procesar en cada turno.

Limitación: no puede actuar mientras la sesión está inactiva. Solo actúa cuando escribes de nuevo.
