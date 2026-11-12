export type AgentRow = { model: string; input: number; output: number; cacheRead: number; turns: number }
export type ModelRow = { input: number; output: number; cacheRead: number; cacheWrite: number; turns: number }
// Un turno del historial: quién, con qué modelo, cuánto y lo que subió el contador de coste.
export type TurnRec = {
  // turnId del motor; falta en historiales guardados por la versión anterior.
  id?: string
  at: number
  agent: string
  model: string
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  cost: number | null
}
// Acumulado por modelo para la comparativa Haiku frente a Opus. Tokens por tipo, por separado.
// costTurns / costTokens / cost: solo los turnos con coste conocido (el primero tras arrancar puede no tenerlo),
// para que el coste por token no mezcle tokens sin coste.
export type CompRow = {
  turns: number
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  costTurns: number
  costTokens: number
  cost: number
}
export type Familia = 'haiku' | 'opus' | 'fable' | 'sonnet' | 'otro'
// Bloque "comparativa" de datos.js: cuánto habría costado la sesión si el trabajo enviado a Haiku hubiera ido a Opus.
// Sin datos suficientes, disponible es false, motivo lo explica y las cifras estimadas son null.
export type Comparativa = {
  disponible: boolean
  motivo?: string
  costeReal: number
  costeOpusEstimado: number | null
  ahorro: number | null
  ahorroPct: number | null
  tokensPorModelo: { familia: Familia; tokens: number; coste: number }[]
}
export type CtxSnap = { tokens: number; window: number; percent: number }
// Libro del coste y de los turnos vistos, en un solo átomo para que update() lo cambie de una vez:
// last: último valor del contador de coste de la sesión (null si aún no se conoce);
// base: lo acumulado antes de que el contador volviera a empezar (/clear, reanudar);
// ids: turnos ya contados (para no duplicar); turn: lo que decidió la última actualización.
export type Ledger = {
  last: number | null
  base: number
  ids: string[]
  turn: { id: string; dup: boolean; cost: number | null } | null
}

// Plan de Claude (TaskCreate / TaskUpdate): las tareas en el orden en que se crearon.
export type PlanEstado = 'pending' | 'in_progress' | 'completed'
export type PlanState = { orden: string[]; tareas: Record<string, { titulo: string; estado: PlanEstado }> }

declare module 'claude-code' {
  interface PluginState {
    'consumo': {
      rows: Shaped<Record<string, AgentRow>>
      models: Shaped<Record<string, ModelRow>>
      hist: Shaped<TurnRec[]>
      labels: Shaped<Record<string, string>>
      ctx: Shaped<CtxSnap | null>
      ledger: Shaped<Ledger>
      plan: Shaped<PlanState>
      comp: Shaped<Record<string, CompRow>>
      // Si el HUD está abierto (session.start o /jarvis lo cambian).
      abierto: Shaped<boolean>
    }
  }
}
