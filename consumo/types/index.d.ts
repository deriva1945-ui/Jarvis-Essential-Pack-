export type AgentRow = { model: string; input: number; output: number; cacheRead: number; turns: number }
export type CtxSnap = { tokens: number; window: number; percent: number }

declare module 'claude-code' {
  interface PluginState {
    'consumo': {
      rows: Shaped<Record<string, AgentRow>>
      labels: Shaped<Record<string, string>>
      ctx: Shaped<CtxSnap | null>
      total: Shaped<number>
    }
  }
}
