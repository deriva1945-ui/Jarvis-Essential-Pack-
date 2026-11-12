import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { AgentRow, CtxSnap } from '../types'
import { PAGE } from './page'

const PANE = 'consumo'
const SHAPE = { shape: 'consumo-1' }
const DIR = 'C:\\CLAUDE\\consumo'
const PAGE_URL = 'file:///C:/CLAUDE/consumo/index.html'

const rows = atom({ plugin: 'consumo', key: 'rows' } as const, {} as Record<string, AgentRow>, SHAPE)
const labels = atom({ plugin: 'consumo', key: 'labels' } as const, {} as Record<string, string>, SHAPE)
const ctx = atom({ plugin: 'consumo', key: 'ctx' } as const, null as CtxSnap | null, SHAPE)
const total = atom({ plugin: 'consumo', key: 'total' } as const, 0, SHAPE)

type Data = {
  modelo: string
  contexto: CtxSnap
  coste: number
  agentes: { nombre: string; modelo: string; input: number; output: number; cacheRead: number; turns: number }[]
  actualizado: number
}

const toData = (
  r: Record<string, AgentRow>,
  lb: Record<string, string>,
  c: CtxSnap | null,
  t: number,
  model: string,
): Data => ({
  modelo: model,
  contexto: c ?? { tokens: 0, window: 1, percent: 0 },
  coste: t,
  agentes: Object.keys(r).map(k => ({
    nombre: k === 'main' ? 'Principal' : (lb[k] ?? k),
    modelo: r[k].model,
    input: r[k].input,
    output: r[k].output,
    cacheRead: r[k].cacheRead,
    turns: r[k].turns,
  })),
  actualizado: Date.now(),
})

// Escribe los datos que lee la página. Un fallo aquí no debe romper la sesión.
const payload = (data: Data) => `window.CONSUMO = ${JSON.stringify(data)};`

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'consumo', description: 'Abre el panel de consumo' })
    void $.ui.open({ id: PANE, title: 'Consumo' })

    try {
      await $.fs.write(`${DIR}\\index.html`, PAGE)
      await $.fs.write(`${DIR}\\datos.js`, payload(toData({}, {}, null, 0, await $.session.model())))
      try {
        await $.process.run(['cmd', '/c', 'start', '', 'msedge', `--app=${PAGE_URL}`])
      } catch {
        await $.process.run(['cmd', '/c', 'start', '', 'chrome', `--app=${PAGE_URL}`])
      }
    } catch {
      // Sin ventana aparte: el panel lateral sigue funcionando.
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'consumo' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Consumo' })
    return { text: 'Panel de consumo abierto.' }
  })

  on('agent.spawn', async ($, e, next) => {
    const r = await next(e)
    if (r.agentId) {
      await update($, labels, l => ({ ...l, [r.agentId as string]: `${e.subagentType}: ${e.description}` }))
    }
    return r
  }).catch(($, e, next) => next(e))

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
    try {
      await $.fs.write(`${DIR}\\datos.js`, payload(
        toData(await read($, rows), await read($, labels), await read($, ctx), await read($, total), await $.session.model()),
      ))
    } catch {
      // La página se queda con los últimos datos.
    }
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    const s = await $.session.usage()
    await update($, ctx, () => ({ tokens: s.context.tokens ?? 0, window: s.context.window, percent: s.context.percent ?? 0 }))
    try {
      await $.fs.write(`${DIR}\\datos.js`, payload(
        toData(await read($, rows), await read($, labels), await read($, ctx), await read($, total), await $.session.model()),
      ))
    } catch {
      // Igual que arriba: sin escritura, el panel lateral sigue al día.
    }
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
