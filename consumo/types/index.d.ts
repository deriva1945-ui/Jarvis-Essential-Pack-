export type AgentRow = { model: string; input: number; output: number; cacheRead: number; turns: number }
export type ModelRow = { input: number; output: number; cacheRead: number; cacheWrite: number; turns: number }
// Un turno del historial: quién, con qué modelo, cuánto y lo que subió el contador de coste.
export type TurnRec = {
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

declare module 'claude-code' {
  interface PluginState {
    'consumo': {
      rows: Shaped<Record<string, AgentRow>>
      models: Shaped<Record<string, ModelRow>>
      hist: Shaped<TurnRec[]>
      labels: Shaped<Record<string, string>>
      ctx: Shaped<CtxSnap | null>
      total: Shaped<number>
    }
  }
}
