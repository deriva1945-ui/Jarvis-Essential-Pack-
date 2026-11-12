import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Estado, Fase } from '../types'

// Cambia la etiqueta si cambian los campos: declina lo que guardó una versión anterior.
const SHAPE = { shape: 'jarvis-banda-2' }

const INICIAL: Estado = { fase: 'idle', detalle: '', modelo: '', modeloDelegado: '' }

const estado = atom({ plugin: 'jarvis-banda', key: 'estado' } as const, INICIAL, SHAPE)

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
}

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
  return model
    .replace(/\[.*?\]/g, '')
    .replace(/^.*?claude-/, '')
    .replace(/-\d{8}$/, '')
    .replace(/-(\d+)-(\d+)$/, '-$1.$2')
    .toUpperCase()
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
  }
}

// Escribe el estado. Nunca lanza: la banda no debe romper el prompt.
async function fijar($: EngineInterface, cambio: (s: Estado) => Estado) {
  try {
    await update($, estado, s => cambio(s ?? INICIAL))
  } catch {
    // La banda se queda como estaba.
  }
}

async function modeloSesion($: EngineInterface) {
  try {
    return await $.session.model()
  } catch {
    return ''
  }
}

const aProcesando = (s: Estado): Estado => ({ ...s, fase: 'procesando', detalle: '', modeloDelegado: '' })

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await fijar($, () => INICIAL)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.submit', async ($, e, next) => {
    const modelo = await modeloSesion($)
    await fijar($, s => ({ ...aProcesando(s), modelo: modelo || s.modelo }))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    // Las herramientas de los subagentes no cambian la banda: la delegación manda.
    if (e.agentId) return next(e)

    const tool = e.tool
    await fijar($, s => ({ ...s, fase: 'ejecutando', detalle: tool }))
    const ran = await next(e)
    await fijar($, s =>
      (s.fase === 'ejecutando' && s.detalle === tool) || s.fase === 'delegando' ? aProcesando(s) : s,
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
    if (e.agentId) {
      // Termina un subagente: vuelve el hilo principal.
      await fijar($, s => (s.fase === 'delegando' ? aProcesando(s) : s))
    } else {
      // Termina el turno: el resumen ya queda en el chat; la banda vuelve a esperar.
      const modelo = e.usage?.model ?? ''
      await fijar($, s => ({ ...INICIAL, modelo: modelo || s.modelo }))
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    try {
      const s = await read($, estado)
      const modelo = s.modelo || (await modeloSesion($))
      const fam = s.fase === 'delegando' && s.modeloDelegado ? familia(s.modeloDelegado) : familia(modelo)
      const { Text } = $.ui.resolve(e)

      return (
        <Text color={COLOR[fam]} bold wrap="truncate-end">
          {SIMBOLO[s.fase]} J.A.R.V.I.S. // {lineaEstado({ ...s, modelo })}
        </Text>
      )
    } catch {
      return next(e)
    }
  })
}
