import { atom, read, update } from 'claude-code'
import type { Hook, Register, Timer } from 'claude-code'

import type { AgentRow, CtxSnap, ModelRow, TurnRec } from '../types'
import { PAGE } from './page'

const PANE = 'consumo'
const SHAPE = { shape: 'consumo-1' }
const DIR = 'C:\\CLAUDE\\consumo'
const PAGE_URL = 'file:///C:/CLAUDE/consumo/index.html'
const HIST_MAX = 20
// Cada cuánto se reescribe datos.js aunque no haya turnos: la página avisa si pasan 10 s sin latido.
const BEAT_MS = 3000
const WARN = 70
const CRIT = 85

const rows = atom({ plugin: 'consumo', key: 'rows' } as const, {} as Record<string, AgentRow>, SHAPE)
const models = atom({ plugin: 'consumo', key: 'models' } as const, {} as Record<string, ModelRow>, SHAPE)
const hist = atom({ plugin: 'consumo', key: 'hist' } as const, [] as TurnRec[], SHAPE)
const labels = atom({ plugin: 'consumo', key: 'labels' } as const, {} as Record<string, string>, SHAPE)
const ctx = atom({ plugin: 'consumo', key: 'ctx' } as const, null as CtxSnap | null, SHAPE)
const total = atom({ plugin: 'consumo', key: 'total' } as const, 0, SHAPE)

type Familia = 'haiku' | 'opus' | 'fable' | 'sonnet' | 'otro'

type ModeloData = {
  modelo: string
  familia: Familia
  entrada: number
  salida: number
  cache: number
  cacheEscritura: number
  turnos: number
  // Reparto del trabajo: % de entrada + salida, y % de turnos.
  reparto: number
  repartoTurnos: number
  // El modelo de la sesión principal (o el que ha contestado en el hilo principal).
  principal: boolean
}

type TurnoData = {
  hora: number
  agente: string
  modelo: string
  familia: Familia
  entrada: number
  salida: number
  cache: number
  cacheEscritura: number
  // Lo que subió el contador de coste de la sesión desde el turno anterior (aprox.).
  coste: number | null
}

type Data = {
  modelo: string
  contexto: CtxSnap
  alerta: 'normal' | 'alta' | 'critica'
  coste: number
  modelos: ModeloData[]
  agentes: { nombre: string; modelo: string; input: number; output: number; cacheRead: number; turns: number }[]
  historial: TurnoData[]
  actualizado: number
  latido: number
}

const familia = (model: string): Familia => {
  const m = model.toLowerCase()
  if (m.includes('haiku')) return 'haiku'
  if (m.includes('opus')) return 'opus'
  if (m.includes('fable')) return 'fable'
  if (m.includes('sonnet')) return 'sonnet'
  return 'otro'
}

const alerta = (c: CtxSnap | null): Data['alerta'] =>
  !c ? 'normal' : c.percent >= CRIT ? 'critica' : c.percent >= WARN ? 'alta' : 'normal'

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part * 1000) / whole) / 10 : 0)

const agentName = (k: string, lb: Record<string, string>) => (k === 'main' ? 'Principal' : (lb[k] ?? k))

const toModelos = (m: Record<string, ModelRow>, r: Record<string, AgentRow>, model: string): ModeloData[] => {
  const ids = Object.keys(m)
  const work = ids.reduce((a, k) => a + (m[k]?.input ?? 0) + (m[k]?.output ?? 0), 0)
  const turns = ids.reduce((a, k) => a + (m[k]?.turns ?? 0), 0)
  const mainModel = r['main']?.model
  return ids
    .map(k => {
      const x = m[k] ?? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, turns: 0 }
      return {
        modelo: k,
        familia: familia(k),
        entrada: x.input,
        salida: x.output,
        cache: x.cacheRead,
        cacheEscritura: x.cacheWrite,
        turnos: x.turns,
        reparto: pct(x.input + x.output, work),
        repartoTurnos: pct(x.turns, turns),
        principal: k === model || k === mainModel,
      }
    })
    .sort((a, b) => b.entrada + b.salida - (a.entrada + a.salida))
}

type Snap = {
  r: Record<string, AgentRow>
  m: Record<string, ModelRow>
  h: TurnRec[]
  lb: Record<string, string>
  c: CtxSnap | null
  t: number
  model: string
  updated: number
}

const toData = ({ r, m, h, lb, c, t, model, updated }: Snap, now: number): Data => ({
  modelo: model,
  contexto: c ?? { tokens: 0, window: 1, percent: 0 },
  alerta: alerta(c),
  coste: t,
  modelos: toModelos(m, r, model),
  agentes: Object.keys(r).flatMap(k => {
    const a = r[k]
    if (!a) return []
    return [{ nombre: agentName(k, lb), modelo: a.model, input: a.input, output: a.output, cacheRead: a.cacheRead, turns: a.turns }]
  }),
  historial: h.map(x => ({
    hora: x.at,
    agente: agentName(x.agent, lb),
    modelo: x.model,
    familia: familia(x.model),
    entrada: x.input,
    salida: x.output,
    cache: x.cacheRead,
    cacheEscritura: x.cacheWrite,
    coste: x.cost,
  })),
  actualizado: updated,
  latido: now,
})

const EMPTY: Snap = { r: {}, m: {}, h: [], lb: {}, c: null, t: 0, model: '', updated: 0 }

// Escribe los datos que lee la página. Un fallo aquí no debe romper la sesión.
const payload = (data: Data) => `window.CONSUMO = ${JSON.stringify(data)};`

const FAM_LABEL: Record<Familia, string> = { haiku: 'Haiku', opus: 'Opus', fable: 'Fable', sonnet: 'Sonnet', otro: 'Otro' }

type Ctx = Parameters<Hook<'tool.call'>>[0]

let beat: Timer | undefined
// Hora del último cambio real de datos (turno o herramienta); el latido no la mueve.
let updatedAt = 0

async function snap($: Ctx): Promise<Snap> {
  return {
    r: await read($, rows),
    m: await read($, models),
    h: await read($, hist),
    lb: await read($, labels),
    c: await read($, ctx),
    t: await read($, total),
    model: await $.session.model(),
    updated: updatedAt,
  }
}

async function writeData($: Ctx): Promise<void> {
  try {
    const s = await snap($)
    await $.fs.write(`${DIR}\\datos.js`, payload(toData(s, await $.clock.now())))
  } catch {
    // La página se queda con los últimos datos y avisa cuando falta el latido.
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'consumo', description: 'Abre el panel de consumo' })
    void $.ui.open({ id: PANE, title: 'Consumo' })

    // Punto de partida del contador de coste: el coste de cada turno es lo que sube desde aquí.
    try {
      const u = await $.session.usage()
      await update($, total, () => u.cost?.usd ?? 0)
    } catch {
      // Sin contador todavía: el primer turno se lleva lo acumulado.
    }

    try {
      await $.fs.write(`${DIR}\\index.html`, PAGE)
      await $.fs.write(`${DIR}\\datos.js`, payload(toData({ ...EMPTY, model: await $.session.model() }, await $.clock.now())))
      try {
        await $.process.run(['cmd', '/c', 'start', '', 'msedge', `--app=${PAGE_URL}`])
      } catch {
        await $.process.run(['cmd', '/c', 'start', '', 'chrome', `--app=${PAGE_URL}`])
      }
    } catch {
      // Sin ventana aparte: el panel lateral sigue funcionando.
    }
    try {
      beat?.cancel()
      beat = $.clock.every(BEAT_MS, () => void writeData($))
    } catch {
      // Sin latido la página marca "sin señal", pero el resto sigue.
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
    const s = await $.session.usage()
    const cost = s.cost?.usd
    const prevTotal = await read($, total)
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
      // Agregado por modelo: un agente que cambia de modelo reparte bien sus turnos.
      const id = u.model || 'desconocido'
      await update($, models, m => {
        const cur = m[id] ?? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, turns: 0 }
        return {
          ...m,
          [id]: {
            input: cur.input + u.input_tokens,
            output: cur.output + u.output_tokens,
            cacheRead: cur.cacheRead + u.cache_read_input_tokens,
            cacheWrite: cur.cacheWrite + u.cache_creation_input_tokens,
            turns: cur.turns + 1,
          },
        }
      })
      const at = await $.clock.now()
      await update($, hist, prev => [
        ...prev,
        {
          at,
          agent: key,
          model: id,
          input: u.input_tokens,
          output: u.output_tokens,
          cacheRead: u.cache_read_input_tokens,
          cacheWrite: u.cache_creation_input_tokens,
          cost: cost === undefined ? null : Math.max(0, cost - prevTotal),
        },
      ].slice(-HIST_MAX))
    }
    await update($, ctx, () => ({ tokens: s.context.tokens ?? 0, window: s.context.window, percent: s.context.percent ?? 0 }))
    await update($, total, () => cost ?? 0)
    updatedAt = await $.clock.now()
    await writeData($)
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    const s = await $.session.usage()
    await update($, ctx, () => ({ tokens: s.context.tokens ?? 0, window: s.context.window, percent: s.context.percent ?? 0 }))
    updatedAt = await $.clock.now()
    await writeData($)
    return ran
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const r = await read($, rows)
    const m = await read($, models)
    const hs = await read($, hist)
    const lb = await read($, labels)
    const c = await read($, ctx)
    const t = await read($, total)
    const model = await $.session.model()
    const keys = Object.keys(r)
    const mods = toModelos(m, r, model)
    const lvl = alerta(c)
    const last = hs[hs.length - 1]

    return (
      <Box flexDirection="column">
        <Text>Modelo de la sesión: {model}</Text>
        <Text color={lvl === 'critica' ? 'red' : lvl === 'alta' ? 'yellow' : undefined}>
          Contexto: {c ? `${c.tokens.toLocaleString()} / ${c.window.toLocaleString()} tokens (${c.percent}%)` : 'sin datos todavía'}
          {lvl === 'critica' ? ` · CRÍTICO (≥${CRIT}%)` : lvl === 'alta' ? ` · ALTO (≥${WARN}%)` : ''}
        </Text>
        <Text>Coste acumulado: {t.toFixed(4)} USD</Text>
        {mods.length > 0 && <Text bold>Por modelo</Text>}
        {mods.map(x => (
          <Text key={x.modelo}>
            {FAM_LABEL[x.familia]}{x.principal ? ' (principal)' : ''} · {x.modelo} · {x.reparto}% del trabajo · turnos {x.turnos} ({x.repartoTurnos}%) · entrada {x.entrada} · salida {x.salida} · caché {x.cache}
          </Text>
        ))}
        {keys.length === 0 && <Text dimColor>Sin turnos todavía.</Text>}
        {keys.length > 0 && <Text bold>Por agente</Text>}
        {keys.map(k => {
          const a = r[k]
          if (!a) return null
          return (
            <Text key={k}>
              {agentName(k, lb)} · {a.model} · entrada {a.input} · salida {a.output} · caché {a.cacheRead} · turnos {a.turns}
            </Text>
          )
        })}
        {last && (
          <Text dimColor>
            Último turno: {agentName(last.agent, lb)} · {last.model} · {last.input + last.output} tokens{last.cost !== null ? ` · ≈${last.cost.toFixed(4)} USD` : ''}
          </Text>
        )}
      </Box>
    )
  })
}
