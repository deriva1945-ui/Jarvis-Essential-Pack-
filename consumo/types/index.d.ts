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
      // Si el HUD está abierto (session.start o /jarvis lo cambian).
      abierto: Shaped<boolean>
    }
  }
}
