import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { AgentRow, CtxSnap } from '../types'

const PANE = 'consumo'
const SHAPE = { shape: 'consumo-1' }
const rows = atom({ plugin: 'consumo', key: 'rows' } as const, {} as Record<string, AgentRow>, SHAPE)
const labels = atom({ plugin: 'consumo', key: 'labels' } as const, {} as Record<string, string>, SHAPE)
const ctx = atom({ plugin: 'consumo', key: 'ctx' } as const, null as CtxSnap | null, SHAPE)
const total = atom({ plugin: 'consumo', key: 'total' } as const, 0, SHAPE)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'consumo', description: 'Abre el panel de consumo' })
    void $.ui.open({ id: PANE, title: 'Consumo' })
    return next(e)
  })

  on('command.run', { command: 'consumo' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Consumo' })
    return { text: 'Panel de consumo abierto.' }
  })

  // Etiqueta legible de cada subagente: tipo y descripción de su tarea.
  on('agent.spawn', async ($, e, next) => {
    const r = await next(e)
    if (r.agentId) {
      await update($, labels, l => ({ ...l, [r.agentId as string]: `${e.subagentType}: ${e.description}` }))
    }
    return r
  }).catch(($, e, next) => next(e))

  // Tokens por agente y modelo, y contexto/coste en cada turno.
  on('turn.complete', async ($, e, next) => {
    const key = e.agentId ?? 'main'
    const u = e.usage
    if (u) {
      await update($, rows, r => {
        const cur = r[key] ?? { model: '', input: 0, output: 0, cacheRead: 0, turns: 0 }
        return {
          ...r,
          [key]: {
            model: u.model,
            input: cur.input + u.input_tokens,
            output: cur.output + u.output_tokens,
            cacheRead: cur.cacheRead + u.cache_read_input_tokens,
            turns: cur.turns + 1,
          },
        }
      })
    }
    const s = await $.session.usage()
    await update($, ctx, () => ({ tokens: s.context.tokens ?? 0, window: s.context.window, percent: s.context.percent ?? 0 }))
    await update($, total, () => s.cost?.usd ?? 0)
    return next(e)
  })

  // Contexto también tras cada herramienta, para que suba en directo durante el turno.
  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    const s = await $.session.usage()
    await update($, ctx, () => ({ tokens: s.context.tokens ?? 0, window: s.context.window, percent: s.context.percent ?? 0 }))
    return ran
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const r = await read($, rows)
    const lb = await read($, labels)
    const c = await read($, ctx)
    const t = await read($, total)
    const model = await $.session.model()
    const keys = Object.keys(r)

    return (
      <Box flexDirection="column">
        <Text>Modelo de la sesión: {model}</Text>
        <Text>
          Contexto: {c ? `${c.tokens.toLocaleString()} / ${c.window.toLocaleString()} tokens (${c.percent}%)` : 'sin datos todavía'}
        </Text>
        <Text>Coste acumulado: {t.toFixed(4)} USD</Text>
        {keys.length === 0 && <Text dimColor>Sin turnos todavía.</Text>}
        {keys.map(k => {
          const a = r[k]
          const name = k === 'main' ? 'Principal' : (lb[k] ?? k)
          return (
            <Text key={k}>
              {name} · {a.model} · entrada {a.input} · salida {a.output} · caché {a.cacheRead} · turnos {a.turns}
            </Text>
          )
        })}
      </Box>
    )
  })
}
