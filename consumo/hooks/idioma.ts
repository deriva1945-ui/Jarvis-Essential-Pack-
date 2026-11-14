// Textos del HUD en inglés (opción idioma = en). La página está escrita en español; cada par es
// [español, inglés] y se aplica en este orden, del texto más largo al más corto, para que una pieza
// corta (" de ") no rompa una frase larga que la contiene. Solo se traducen etiquetas de la página,
// nunca datos (nombres de agentes, modelos o títulos de tareas).
// Se incrusta en el HTML (ver page.ts) igual que senal.ts y dom.ts: sin acentos graves, dólar-llave
// ni barras invertidas en los textos.

export const EN: readonly (readonly [string, string])[] = [
  ['HUD cerrado. Escribe /jarvis para abrirlo.', 'HUD closed. Type /jarvis to open it.'],
  ['Sin sesiones guardadas todavía', 'No saved sessions yet'],
  ['Estimación con tus turnos reales; varía con la caché y con la proporción de entrada y salida.', 'Estimate from your real turns; it varies with cache use and the input/output mix.'],
  ['Suma del coste de los turnos contados; el panel Coste incluye además lo gastado antes de abrir el HUD', 'Sum of the cost of the counted turns; the Cost panel also includes what was spent before the HUD opened'],
  ['), así que no se usa para la estimación', '), so it is not used for the estimate'],
  [' tokens con coste (hacen falta más de ', ' tokens with cost (it needs more than '],
  ['sus turnos no tienen coste medido', 'its turns have no measured cost'],
  [': en tus turnos Haiku no salió más barato', ': in your turns Haiku was not cheaper'],
  [' menos que todo en Opus', ' less than all on Opus'],
  ['tono claro: entrada; intenso: salida', 'light: input; solid: output'],
  ['Comparativa · Haiku frente a Opus', 'Haiku vs Opus'],
  ['Plan · sin tareas activas', 'Plan · no active tasks'],
  ['Si todo fuera Opus', 'If all were Opus'],
  ['datos.js no responde', 'datos.js is not responding'],
  ['Último turno sin coste', 'Last turn without cost'],
  ['Modelo de la sesión', 'Session model'],
  ['Últimas sesiones', 'Latest sessions'],
  ['sin datos todavía', 'no data yet'],
  ['esta sesión', 'this session'],
  ['Esta semana', 'This week'],
  ['Acumulado', 'Across sessions'],
  ['Reparto por modelo', 'Split by model'],
  ['Progreso del plan', 'Plan progress'],
  ['Sin turnos todavía', 'No turns yet'],
  ['Contexto crítico', 'Critical context'],
  ['Sin datos nuevos', 'No new data'],
  ['Sin señal hace ', 'No signal for '],
  [' tokens con caché', ' tokens with cache'],
  ['Tokens por turno', 'Tokens per turn'],
  ['Último turno', 'Last turn'],
  ['Últimos turnos', 'Latest turns'],
  ['Contexto alto', 'High context'],
  ['Coste por turno', 'Cost per turn'],
  ['Real en turnos', 'Actual (turns)'],
  ['sin estimación', 'no estimate'],
  ['Último dato', 'Last update'],
  ['Comprobando', 'Checking'],
  ['Completado', 'Completed'],
  ['sin datos de ', 'no data for '],
  ['sin turnos', 'no turns'],
  ['sin ahorro', 'no saving'],
  [' solo lleva ', ' only has '],
  [' todavía', ' yet'],
  ['Diferencia', 'Difference'],
  ['Esperando', 'Waiting'],
  ['Sin señal', 'No signal'],
  ['En línea', 'Online'],
  ['En curso', 'In progress'],
  ['Pendiente', 'Pending'],
  ['principal', 'main'],
  ['Contexto', 'Context'],
  [' agentes', ' agents'],
  [' agente', ' agent'],
  [' turnos', ' turns'],
  [' turno', ' turn'],
  [' sesiones', ' sessions'],
  [' sesión', ' session'],
  ['desde ', 'since '],
  ['Agentes', 'Agents'],
  ['Agente', 'Agent'],
  ['Crítico', 'Critical'],
  ['Ventana', 'Window'],
  ['Reparto', 'Share'],
  ['Trabajo', 'Work'],
  ['entrada', 'input'],
  ['salida', 'output'],
  ['caché', 'cache'],
  ['Latido', 'Heartbeat'],
  ['Tareas', 'Tasks'],
  ['Turnos', 'Turns'],
  ['Modelo', 'Model'],
  ['Avisos', 'Warnings'],
  ['ahorro', 'saving'],
  ['Ahorro', 'Saving'],
  ['Señal', 'Signal'],
  ['Reloj', 'Clock'],
  ['Coste', 'Cost'],
  ['Libre', 'Free'],
  ['usado', 'used'],
  ['Hecha', 'Done'],
  ['Alto', 'High'],
  ['Hora', 'Time'],
  ['Hoy', 'Today'],
  ['pico', 'peak'],
  [' de ', ' of '],
]

// Sustituye cada texto en español por su versión en inglés. Autónoma: se pega en la página con toString().
export function traducir(s: unknown, pares: readonly (readonly [string, string])[]): string {
  let t = String(s)
  for (let i = 0; i < pares.length; i++) {
    const par = pares[i] as readonly [string, string]
    if (t.indexOf(par[0]) >= 0) t = t.split(par[0]).join(par[1])
  }
  return t
}

// El bloque que se pega en la página.
export const IDIOMA_JS = ['var EN=' + JSON.stringify(EN) + ';', 'var traducir=(' + String(traducir) + ');'].join('\n')
