import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Contexto, Estado, Fase, Reparto } from '../types'

// Cambia la etiqueta si cambian los campos: declina lo que guardó una versión anterior.
const SHAPE = { shape: 'jarvis-banda-1' }

const INICIAL: Estado = {
  fase: 'idle',
  detalle: '',
  modelo: '',
  modeloDelegado: '',
  tokens: 0,
  coste: 0,
  costeInicio: 0,
}

const estado = atom({ plugin: 'jarvis-banda', key: 'estado' } as const, INICIAL, SHAPE)
const reparto = atom({ plugin: 'jarvis-banda', key: 'reparto' } as const, {} as Reparto, SHAPE)
const contexto = atom({ plugin: 'jarvis-banda', key: 'contexto' } as const, null as Contexto | null, SHAPE)

type Familia = 'haiku' | 'opus' | 'fable' | 'otro'

// Un token de color por modelo.
const COLOR: Record<Familia, string> = {
  haiku: '#7dd3fc', // cian
  opus: '#fbbf24', // ámbar
  fable: '#c4b5fd', // violeta
  otro: '#dbeafe', // blanco azulado
}

// Símbolo por estado: todos de una columna.
const SIMBOLO: Record<Fase, string> = {
  idle: '◌',
  procesando: '◐',
  ejecutando: '◑',
  delegando: '◒',
  completado: '●',
}

const SEGMENTOS = 10

export const familia = (model: string): Familia => {
  const m = model.toLowerCase()
  if (m.includes('haiku')) return 'haiku'
  if (m.includes('opus')) return 'opus'
  if (m.includes('fable')) return 'fable'
  return 'otro'
}

// "claude-opus-5-5" -> "OPUS-5.5"; "claude-haiku-4-5-20251001" -> "HAIKU-4.5"; "haiku" -> "HAIKU".
export const nombreModelo = (model: string): string => {
  if (!model) return '—'
  const limpio = model
    .replace(/\[.*?\]/g, '')
    .replace(/^.*?claude-/, '')
    .replace(/-\d{8}$/, '')
    .replace(/-(\d+)-(\d+)$/, '-$1.$2')
  return limpio.toUpperCase()
}

export const formatoTokens = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export const formatoCoste = (usd: number): string => `$${usd.toFixed(usd < 1 ? 4 : 2)}`

export const barra = (percent: number): { llenos: string; vacios: string } => {
  const p = Math.max(0, Math.min(100, percent))
  const n = Math.min(SEGMENTOS, Math.round((p / 100) * SEGMENTOS))
  return { llenos: '▰'.repeat(n), vacios: '▱'.repeat(SEGMENTOS - n) }
}

export const lineaEstado = (s: Estado): string => {
  switch (s.fase) {
    case 'idle':
      return 'ESPERANDO ÓRDENES'
    case 'procesando':
      return `PROCESANDO · ${nombreModelo(s.modelo)}`
    case 'ejecutando':
      return `EJECUTANDO ${s.detalle}`
    case 'delegando':
      return `DELEGANDO → ${s.detalle} (${nombreModelo(s.modeloDelegado)})`
    case 'completado':
      return `TAREA COMPLETADA · ${formatoTokens(s.tokens)} TOKENS · ${formatoCoste(s.coste)}`
  }
}

const reparteEnPorcentajes = (r: Reparto): { fam: Familia; pct: number }[] => {
  const total = Object.values(r).reduce((a, n) => a + n, 0)
  if (total <= 0) return []
  return (Object.keys(r) as Familia[])
    .map(fam => ({ fam, pct: Math.round(((r[fam] ?? 0) * 100) / total) }))
    .sort((a, b) => b.pct - a.pct)
}

// Escribe el estado y lo refleja en la línea de estado. Nunca lanza.
async function fijar($: EngineInterface, cambio: (s: Estado) => Estado) {
  try {
    await update($, estado, s => cambio(s ?? INICIAL))
    const s = await read($, estado)
    $.ui.status(`${SIMBOLO[s.fase]} J.A.R.V.I.S. · ${lineaEstado(s)}`)
  } catch {
    // La banda no debe romper el prompt.
  }
}

async function modeloSesion($: EngineInterface) {
  try {
    return await $.session.model()
  } catch {
    return ''
  }
}

async function leeContexto($: EngineInterface) {
  try {
    const u = await $.session.usage()
    await update($, contexto, () => ({
      tokens: u.context.tokens ?? 0,
      window: u.context.window,
      percent: u.context.percent ?? 0,
    }))
    return u.cost?.usd ?? 0
  } catch {
    return 0
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await fijar($, () => INICIAL)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.submit', async ($, e, next) => {
    const modelo = await modeloSesion($)
    const costeInicio = await leeContexto($)
    try {
      await update($, reparto, () => ({}))
    } catch {
      // sin reparto
    }
    await fijar($, s => ({
      ...s,
      fase: 'procesando',
      detalle: '',
      modelo: modelo || s.modelo,
      modeloDelegado: '',
      costeInicio,
    }))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    // Las herramientas de los subagentes no cambian la banda: la delegación manda.
    if (e.agentId) return next(e)

    const tool = e.tool
    await fijar($, s => ({ ...s, fase: 'ejecutando', detalle: tool }))
    const ran = await next(e)
    await leeContexto($)
    await fijar($, s =>
      (s.fase === 'ejecutando' && s.detalle === tool) || s.fase === 'delegando'
        ? { ...s, fase: 'procesando', detalle: '', modeloDelegado: '' }
        : s,
    )
    return ran
  }).catch(($, e, next) => next(e))

  on('agent.spawn', async ($, e, next) => {
    const r = await next(e)
    if (r.deny === undefined) {
      const delegado = r.model || e.model || e.parentModel
      await fijar($, s => ({ ...s, fase: 'delegando', detalle: e.subagentType, modeloDelegado: delegado }))
    }
    return r
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    try {
      const u = e.usage
      const tokens = u ? u.input_tokens + u.output_tokens : 0
      if (u) {
        const fam = familia(u.model)
        await update($, reparto, r => ({ ...r, [fam]: (r[fam] ?? 0) + tokens }))
      }

      if (e.agentId) {
        // Termina un subagente.
        if (u && familia(u.model) === 'opus') {
          $.ui.toast(`◒ J.A.R.V.I.S. · SUBAGENTE OPUS TERMINADO · ${formatoTokens(tokens)} TOKENS`)
        }
        await fijar($, s =>
          s.fase === 'delegando' ? { ...s, fase: 'procesando', detalle: '', modeloDelegado: '' } : s,
        )
      } else {
        // Termina el turno principal.
        const costeAhora = await leeContexto($)
        const prev = await read($, estado)
        const coste = Math.max(0, costeAhora - (prev.costeInicio ?? 0))
        const r = await read($, reparto)
        const total = Object.values(r).reduce((a, n) => a + n, 0)
        const modelo = u?.model || (await modeloSesion($)) || prev.modelo
        await fijar($, s => ({
          ...s,
          fase: 'completado',
          detalle: '',
          modelo,
          modeloDelegado: '',
          tokens: total || tokens,
          coste,
        }))
        $.ui.toast(`● J.A.R.V.I.S. · TAREA COMPLETADA · ${formatoTokens(total || tokens)} TOKENS · ${formatoCoste(coste)}`)
      }
    } catch {
      // La banda se queda como estaba.
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    try {
      const s = await read($, estado)
      const r = await read($, reparto)
      const ctx = await read($, contexto)
      const modelo = s.modelo || (await modeloSesion($))
      let percent = ctx?.percent
      let ventana = ctx
      if (ventana === null) {
        try {
          const u = await $.session.usage()
          ventana = { tokens: u.context.tokens ?? 0, window: u.context.window, percent: u.context.percent ?? 0 }
          percent = ventana.percent
        } catch {
          // sin contexto
        }
      }

      const fam = s.fase === 'delegando' && s.modeloDelegado ? familia(s.modeloDelegado) : familia(modelo)
      const color = COLOR[fam]
      const cabecera =
        `${SIMBOLO[s.fase]} J.A.R.V.I.S. // ONLINE · MODELO ${nombreModelo(modelo)}` +
        (percent !== undefined ? ` · CTX ${percent}%` : '') +
        (s.fase === 'ejecutando' ? ` · TAREA: ${s.detalle}` : '')
      const partes = s.fase === 'completado' ? reparteEnPorcentajes(r) : []
      const b = ventana ? barra(ventana.percent) : null

      const { Box, Text } = $.ui.resolve(e)

      return (
        <Box flexDirection="column">
          <Text color={color} bold wrap="truncate-end">
            {cabecera}
          </Text>
          <Text color={color} wrap="truncate-end">
            {lineaEstado(s)}
          </Text>
          {partes.length > 0 && (
            <Text wrap="truncate-end">
              <Text dimColor>REPARTO </Text>
              {partes.map((p, i) => (
                <Text color={COLOR[p.fam]}>
                  {i > 0 ? ' · ' : ''}
                  {p.fam === 'otro' ? 'OTROS' : p.fam.toUpperCase()} {p.pct}%
                </Text>
              ))}
            </Text>
          )}
          {s.fase === 'completado' && ventana && b && (
            <Text wrap="truncate-end">
              <Text dimColor>CTX </Text>
              <Text color={color}>{b.llenos}</Text>
              <Text dimColor>{b.vacios}</Text>
              <Text color={color}>
                {' '}
                {ventana.percent}% · {formatoTokens(ventana.tokens)}/{formatoTokens(ventana.window)}
              </Text>
            </Text>
          )}
        </Box>
      )
    } catch {
      return next(e)
    }
  })
}
