import { atom, read, update } from 'claude-code'
import type { EngineInterface, PluginOptions, Register } from 'claude-code'

import type { Ajustes, Estado, Fase, Idioma, Modo } from '../types'

// Cambia la etiqueta si cambian los campos: declina lo que guardó una versión anterior.
const SHAPE = { shape: 'jarvis-banda-3' }

const INICIAL: Estado = {
  fase: 'esperando',
  herramienta: '',
  agente: '',
  modelo: '',
  modeloDelegado: '',
  contexto: -1,
  brillo: false,
}

const SIN_AJUSTES: Ajustes = { idioma: '', modo: '' }

const estado = atom({ plugin: 'jarvis-banda', key: 'estado' } as const, INICIAL, SHAPE)
const ajustes = atom({ plugin: 'jarvis-banda', key: 'ajustes' } as const, SIN_AJUSTES, { shape: 'jarvis-banda-ajustes-1' })

export type Familia = 'haiku' | 'opus' | 'fable' | 'otro'

// Colores por defecto; cada uno se cambia con userConfig.
export const COLOR_DEFECTO: Record<Familia, string> = {
  haiku: '#7dd3fc', // cian
  opus: '#fbbf24', // ámbar
  fable: '#c4b5fd', // violeta
  otro: '#dbeafe', // blanco azulado
}

// El error se pinta en rojo, sea cual sea el modelo.
export const COLOR_ERROR = '#f87171'

// Símbolo por estado: todos de una columna.
export const SIMBOLO: Record<Fase, string> = {
  esperando: '◌',
  procesando: '◐',
  pensando: '◓',
  ejecutando: '◑',
  delegando: '◒',
  permiso: '◈',
  error: '✕',
}

// Cuánto dura el pulso tras un cambio de estado.
export const PULSO_MS = 600

const TEXTOS = {
  es: {
    esperando: 'ESPERANDO ÓRDENES',
    procesando: 'PROCESANDO',
    pensando: 'PENSANDO',
    ejecutando: 'EJECUTANDO',
    delegando: 'DELEGANDO',
    permiso: 'ESPERANDO PERMISO',
    error: 'ERROR EN',
  },
  en: {
    esperando: 'AWAITING ORDERS',
    procesando: 'PROCESSING',
    pensando: 'THINKING',
    ejecutando: 'RUNNING',
    delegando: 'DELEGATING',
    permiso: 'AWAITING PERMISSION',
    error: 'ERROR IN',
  },
} as const satisfies Record<Idioma, Record<Fase, string>>

export type Config = {
  idioma: Idioma
  modo: Modo
  mostrarModelo: boolean
  mostrarContexto: boolean
  animacion: boolean
  colores: Record<Familia, string>
}

const esColor = (v: unknown): v is string =>
  typeof v === 'string' && /^(#[0-9a-f]{3}|#[0-9a-f]{6}|[a-z]+)$/i.test(v.trim())

const esIdioma = (v: unknown): v is Idioma => v === 'es' || v === 'en'
const esModo = (v: unknown): v is Modo => v === 'completo' || v === 'compacto' || v === 'oculto'

// Lee userConfig; todo valor raro cae en su valor por defecto.
export const leerConfig = (o: PluginOptions): Config => {
  const color = (k: string, f: Familia) => {
    const v = o[k]
    return esColor(v) ? v.trim() : COLOR_DEFECTO[f]
  }
  const si = (k: string, def: boolean) => (typeof o[k] === 'boolean' ? (o[k] as boolean) : def)
  return {
    idioma: esIdioma(o['idioma']) ? o['idioma'] : 'es',
    modo: esModo(o['modo']) ? o['modo'] : 'completo',
    mostrarModelo: si('mostrarModelo', true),
    mostrarContexto: si('mostrarContexto', true),
    animacion: si('animacion', true),
    colores: {
      haiku: color('colorHaiku', 'haiku'),
      opus: color('colorOpus', 'opus'),
      fable: color('colorFable', 'fable'),
      otro: color('colorOtro', 'otro'),
    },
  }
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

// "mcp__github__create_issue" -> "github/create_issue"; el resto, tal cual.
export const nombreHerramienta = (tool: string): string => {
  const m = /^mcp__(.+?)__(.+)$/.exec(tool)
  return m ? `${m[1]}/${m[2]}` : tool
}

// El texto del estado, sin símbolo ni segmentos de modelo o contexto.
export const textoEstado = (s: Estado, idioma: Idioma): string => {
  const t = TEXTOS[idioma]
  const h = nombreHerramienta(s.herramienta)
  switch (s.fase) {
    case 'esperando':
    case 'procesando':
    case 'pensando':
      return t[s.fase]
    case 'ejecutando':
      return `${t.ejecutando} ${h}`
    case 'delegando':
      return `${t.delegando} → ${s.agente} (${nombreModelo(s.modeloDelegado)})`
    case 'permiso':
      return `${t.permiso} · ${h}`
    case 'error':
      return `${t.error} ${h}`
  }
}

// La línea entera tal como se ve (el símbolo incluido).
export const lineaCompleta = (s: Estado, c: Config): string => {
  const partes = [textoEstado(s, c.idioma)]
  if (c.modo === 'compacto') return `${SIMBOLO[s.fase]} ${partes[0]}`
  if (c.mostrarModelo) partes.push(nombreModelo(s.modelo))
  if (c.mostrarContexto && s.contexto >= 0) partes.push(`CTX ${s.contexto}%`)
  return `${SIMBOLO[s.fase]} J.A.R.V.I.S. // ${partes.join(' · ')}`
}

export const colorDe = (s: Estado, c: Config): string => {
  if (s.fase === 'error') return COLOR_ERROR
  const fam = s.fase === 'delegando' && s.modeloDelegado ? familia(s.modeloDelegado) : familia(s.modelo)
  return c.colores[fam]
}

// Respuesta de /banda: cambia idioma o modo solo en esta sesión.
export const aplicarComando = (
  args: string,
  actual: Ajustes,
  c: Config,
): { ajustes: Ajustes; texto: string } => {
  const arg = args.trim().toLowerCase()
  let nuevos = actual
  if (esIdioma(arg)) nuevos = { ...actual, idioma: arg }
  else if (esModo(arg)) nuevos = { ...actual, modo: arg }
  else if (arg === 'reset' || arg === 'config') nuevos = SIN_AJUSTES
  else if (arg !== '') {
    const idioma = actual.idioma || c.idioma
    return {
      ajustes: actual,
      texto:
        idioma === 'en'
          ? `Unknown option "${arg}". Use: /banda es | en | completo | compacto | oculto | reset`
          : `Opción desconocida "${arg}". Usa: /banda es | en | completo | compacto | oculto | reset`,
    }
  }
  const idioma = nuevos.idioma || c.idioma
  const modo = nuevos.modo || c.modo
  const temporal = nuevos.idioma !== '' || nuevos.modo !== ''
  const texto =
    idioma === 'en'
      ? `Band: language ${idioma}, mode ${modo}${temporal ? ' (this session only; /banda reset goes back to the settings)' : ' (from the settings)'}.`
      : `Banda: idioma ${idioma}, modo ${modo}${temporal ? ' (solo esta sesión; /banda reset vuelve a la configuración)' : ' (según la configuración)'}.`
  return { ajustes: nuevos, texto }
}

async function modeloSesion($: EngineInterface) {
  try {
    return await $.session.model()
  } catch {
    return ''
  }
}

async function contextoSesion($: EngineInterface): Promise<number> {
  try {
    const p = (await $.session.usage()).context.percent
    return typeof p === 'number' ? Math.round(p) : -1
  } catch {
    return -1
  }
}

const aProcesando = (s: Estado): Estado => ({ ...s, fase: 'procesando', herramienta: '', agente: '', modeloDelegado: '' })

// Vuelve a la delegación si hay un subagente en marcha; si no, a procesando.
const aDelegacionOProcesando = (s: Estado): Estado =>
  s.agente ? { ...s, fase: 'delegando', herramienta: '' } : aProcesando(s)

const mismoEstado = (a: Estado, b: Estado) =>
  a.fase === b.fase && a.herramienta === b.herramienta && a.agente === b.agente && a.modeloDelegado === b.modeloDelegado

// Número del último pulso: solo el más reciente lo apaga.
let pulso = 0
// userConfig.animacion; lo fija register.
let animacion = true

// Escribe el estado. Nunca lanza: la banda no debe romper el prompt.
// Con animación, un cambio de estado enciende el pulso y un temporizador lo apaga.
async function fijar($: EngineInterface, cambio: (s: Estado) => Estado) {
  let cambiado = false
  try {
    await update($, estado, prev => {
      const s = prev ?? INICIAL
      const n = cambio(s)
      cambiado = !mismoEstado(s, n)
      return cambiado && animacion ? { ...n, brillo: true } : n
    })
  } catch {
    return
  }
  if (!cambiado || !animacion) return
  const mio = ++pulso
  try {
    $.clock.after(PULSO_MS, () => {
      if (mio !== pulso) return
      void update($, estado, s => (s && s.brillo ? { ...s, brillo: false } : (s ?? INICIAL))).catch(() => {})
    })
  } catch {
    // Sin reloj: el pulso se apaga con el siguiente cambio.
  }
}

async function fijarContexto($: EngineInterface, contexto: number) {
  if (contexto < 0) return
  try {
    await update($, estado, s => ({ ...(s ?? INICIAL), contexto }))
  } catch {
    // Sin contexto: el segmento no se muestra.
  }
}

export const register: Register = (on, options) => {
  const config = leerConfig(options)
  animacion = config.animacion
  on('session.start', async ($, e, next) => {
    await fijar($, () => INICIAL)
    try {
      await $.command.register({
        name: 'banda',
        description: 'Cambia el idioma o el modo de la banda solo en esta sesión',
        argumentHint: '[es|en|completo|compacto|oculto|reset]',
        immediate: true,
      })
    } catch {
      // Sin comando: la banda sigue igual.
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'banda' }, async ($, e) => {
    const actual = (await read($, ajustes).catch(() => SIN_AJUSTES)) ?? SIN_AJUSTES
    const r = aplicarComando(e.args, actual, config)
    if (r.ajustes !== actual) await update($, ajustes, () => r.ajustes)
    return { text: r.texto }
  })

  on('prompt.submit', async ($, e, next) => {
    const modelo = await modeloSesion($)
    await fijar($, s => ({ ...aProcesando(s), modelo: modelo || s.modelo }))
    return next(e)
  }).catch(($, e, next) => next(e))

  // Pensando: mientras llega texto de razonamiento visible del hilo principal.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId !== undefined) return yield* next(e)
    const stream = next(e)
    let pensando = false
    const salir = () => fijar($, s => (s.fase === 'pensando' ? aProcesando(s) : s))
    for (;;) {
      const r = await stream.next()
      if (r.done) {
        if (pensando) await salir()
        return r.value
      }
      const c = r.value
      if (c.kind === 'thinking' && c.text.trim() !== '' && !pensando) {
        pensando = true
        await fijar($, s => (s.fase === 'procesando' || s.fase === 'error' ? { ...s, fase: 'pensando' } : s))
      } else if ((c.kind === 'text' || c.kind === 'tool') && pensando) {
        pensando = false
        await salir()
      }
      yield c
    }
  })

  on('tool.call', async ($, e, next) => {
    const tool = e.tool
    if (e.agentId) {
      // Las herramientas de los subagentes no cambian la banda, salvo para
      // salir de un permiso pedido dentro de la delegación.
      const ran = await next(e)
      await fijar($, s => (s.fase === 'permiso' && s.herramienta === tool ? aDelegacionOProcesando(s) : s))
      return ran
    }

    await fijar($, s => ({ ...s, fase: 'ejecutando', herramienta: tool }))
    const ran = await next(e)
    const fallo = ran.deny === undefined && ran.isError === true
    await fijar($, s => {
      const mia = (s.fase === 'ejecutando' || s.fase === 'permiso') && s.herramienta === tool
      if (fallo && (mia || s.fase === 'delegando')) return { ...aProcesando(s), fase: 'error', herramienta: tool }
      return mia || s.fase === 'delegando' ? aProcesando(s) : s
    })
    return ran
  }).catch(($, e, next) => next(e))

  // Esperando permiso: el motor va a preguntar antes de ejecutar la herramienta.
  on('tool.check', async ($, e, next) => {
    const r = await next(e)
    if (r.decision === 'ask' && e.tool_use_id !== undefined) {
      await fijar($, s => ({ ...s, fase: 'permiso', herramienta: e.tool }))
    }
    return r
  }).catch(($, e, next) => next(e))

  on('agent.spawn', async ($, e, next) => {
    const r = await next(e)
    if (r.deny === undefined) {
      const delegado = r.model || e.model || e.parentModel
      await fijar($, s => ({ ...s, fase: 'delegando', herramienta: '', agente: e.subagentType, modeloDelegado: delegado }))
    }
    return r
  }).catch(($, e, next) => next(e))

  on('session.measure', async ($, e, next) => {
    const p = e.context.percent
    if (typeof p === 'number') await fijarContexto($, Math.round(p))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    if (e.agentId) {
      // Termina un subagente: vuelve el hilo principal.
      await fijar($, s => (s.fase === 'delegando' ? aProcesando(s) : s))
    } else {
      // Termina el turno: el resumen ya queda en el chat; la banda vuelve a esperar.
      const modelo = e.usage?.model ?? ''
      const contexto = await contextoSesion($)
      await fijar($, s => ({
        ...INICIAL,
        modelo: modelo || s.modelo,
        contexto: contexto >= 0 ? contexto : s.contexto,
      }))
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    try {
      const a = (await read($, ajustes)) ?? SIN_AJUSTES
      const c: Config = { ...config, idioma: a.idioma || config.idioma, modo: a.modo || config.modo }
      if (c.modo === 'oculto') return next(e)

      const guardado = (await read($, estado)) ?? INICIAL
      const s: Estado = { ...guardado, modelo: guardado.modelo || (await modeloSesion($)) }
      const color = colorDe(s, c)
      const resto = lineaCompleta(s, c).slice(SIMBOLO[s.fase].length)
      const { Text } = $.ui.resolve(e)

      return (
        <Text color={color} bold wrap="truncate-end">
          <Text inverse={s.brillo}>{SIMBOLO[s.fase]}</Text>
          {resto}
        </Text>
      )
    } catch {
      return next(e)
    }
  })
}
