// Lógica pura del resumen de traspaso: opciones, datos de herramientas, prompt, lectura de la
// respuesta del modelo y texto final. Sin acceso al disco, al modelo ni al reloj.

import type { PluginOptions } from 'claude-code'

export type Idioma = 'es' | 'en'

export type Config = {
  // Horas sin actividad a partir de las que el siguiente mensaje genera el resumen.
  idleHours: number
  // Límite de tokens de la respuesta del modelo.
  maxTokens: number
  // Si el resumen lleva la sección de archivos tocados.
  includeFiles: boolean
  idioma: Idioma
  dataDir: string
}

export const CONFIG_DEFAULT: Config = {
  idleHours: 2,
  maxTokens: 800,
  includeFiles: true,
  idioma: 'es',
  dataDir: '~/CLAUDE/resumen-sesion',
}

export const MAX_TOKENS_MIN = 200
export const MAX_TOKENS_MAX = 8000

const num = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v.replace(',', '.')) : NaN
  return Number.isFinite(n) ? n : undefined
}

// Lee las opciones de userConfig con valores por defecto y límites razonables.
export function leerConfig(options: PluginOptions): Config {
  const h = num(options['idleHours'])
  const t = num(options['maxTokens'])
  const f = options['includeFiles']
  const l = options['language']
  const d = options['dataDir']
  return {
    idleHours: h !== undefined && h > 0 ? h : CONFIG_DEFAULT.idleHours,
    maxTokens:
      t !== undefined && t > 0 ? Math.min(MAX_TOKENS_MAX, Math.max(MAX_TOKENS_MIN, Math.round(t))) : CONFIG_DEFAULT.maxTokens,
    includeFiles: typeof f === 'boolean' ? f : f === 'false' ? false : CONFIG_DEFAULT.includeFiles,
    idioma: l === 'en' ? 'en' : 'es',
    dataDir: typeof d === 'string' && d.trim() !== '' ? d : CONFIG_DEFAULT.dataDir,
  }
}

// Lo que el mod lee de cada mensaje (forma de SessionMessage, sin depender de ella).
export type Uso = { tool: string; input: Record<string, unknown>; text?: string; isError?: true }
export type Mensaje = { role: 'user' | 'assistant'; text: string; toolUses?: readonly Uso[] }

export type Datos = { archivos: string[]; comandos: string[]; errores: string[] }

const HERRAMIENTAS_ESCRITURA = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])
const HERRAMIENTAS_SHELL = new Set(['Bash', 'PowerShell'])
// Comandos de solo consulta que no aportan al traspaso.
const TRIVIALES = new Set([
  'ls', 'dir', 'pwd', 'cd', 'cat', 'head', 'tail', 'echo', 'which', 'where', 'wc', 'clear', 'cls', 'true', 'type', 'more', 'less', 'tree',
])

export const MAX_ARCHIVOS = 40
export const MAX_COMANDOS = 15
export const MAX_ERRORES = 10

const corta = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
const primeraLinea = (s: string) => s.split('\n').map(x => x.trim()).find(Boolean) ?? ''

// Primera palabra de un comando, sin rutas ni variables de entorno delante.
const verbo = (cmd: string) => {
  const w = cmd.trim().split(/\s+/).find(x => !/^[A-Za-z_][A-Za-z0-9_]*=/.test(x)) ?? ''
  return w.replace(/^.*[\\/]/, '').toLowerCase()
}

const unicos = (xs: string[]) => [...new Set(xs)]

// Archivos tocados (rutas únicas), comandos relevantes y errores, a partir de las herramientas.
export function extraerDatos(msgs: readonly Mensaje[]): Datos {
  const archivos: string[] = []
  const comandos: string[] = []
  const errores: string[] = []
  for (const m of msgs) {
    for (const u of m.toolUses ?? []) {
      if (u.isError) {
        const t = primeraLinea(u.text ?? '')
        errores.push(corta(`${u.tool}: ${t || '(sin texto)'}`, 200))
        continue
      }
      if (HERRAMIENTAS_ESCRITURA.has(u.tool)) {
        const p = u.input['file_path'] ?? u.input['notebook_path']
        if (typeof p === 'string' && p.trim()) archivos.push(p.trim())
      } else if (HERRAMIENTAS_SHELL.has(u.tool)) {
        const c = u.input['command']
        if (typeof c !== 'string' || !c.trim()) continue
        // Un comando encadenado cuenta como relevante si alguna parte lo es.
        const partes = c.split(/&&|\|\||;|\|/).map(verbo).filter(Boolean)
        if (partes.length > 0 && partes.every(p => TRIVIALES.has(p))) continue
        comandos.push(corta(c.trim().replace(/\s*\n\s*/g, ' ⏎ '), 200))
      }
    }
  }
  return {
    archivos: unicos(archivos).slice(0, MAX_ARCHIVOS),
    comandos: unicos(comandos.reverse()).slice(0, MAX_COMANDOS).reverse(),
    errores: unicos(errores.reverse()).slice(0, MAX_ERRORES).reverse(),
  }
}

export const MAX_MENSAJES = 30
const MAX_CHARS_MENSAJE = 600

// Últimos mensajes con texto, recortados, como conversación legible.
export function historial(msgs: readonly Mensaje[], idioma: Idioma): string {
  const yo = idioma === 'en' ? 'User' : 'Usuario'
  return msgs
    .filter(m => m.text.trim() !== '')
    .slice(-MAX_MENSAJES)
    .map(m => `${m.role === 'user' ? yo : 'Claude'}: ${corta(m.text.trim(), MAX_CHARS_MENSAJE)}`)
    .join('\n---\n')
}

type Textos = {
  titulo: string
  fecha: string
  origen: string
  auto: (h: string) => string
  manual: string
  objetivo: string
  decisiones: string
  archivos: string
  comandos: string
  errores: string
  pendientes: string
  ninguno: string
  sinModelo: string
  instrucciones: string
  copiarDesde: string
  copiarHasta: string
  cabeceraCopia: string
  sugerencia: string
}

export const TEXTOS: Record<Idioma, Textos> = {
  es: {
    titulo: 'Resumen de traspaso',
    fecha: 'Fecha',
    origen: 'Origen',
    auto: h => `automático, tras ${h} h sin actividad`,
    manual: 'bajo demanda (/resumen)',
    objetivo: 'Objetivo',
    decisiones: 'Decisiones tomadas',
    archivos: 'Archivos tocados',
    comandos: 'Comandos ejecutados',
    errores: 'Errores vistos',
    pendientes: 'Pendientes',
    ninguno: '(ninguno)',
    sinModelo: '(no disponible: el modelo no respondió)',
    instrucciones:
      'Escribe una nota de traspaso de esta sesión de programación para retomarla en una sesión nueva. ' +
      'Responde en español, solo con estas tres secciones y en este orden, cada una con su encabezado exacto:\n' +
      '## Objetivo\n(1 o 2 frases: qué se quiere conseguir)\n' +
      '## Decisiones tomadas\n(viñetas breves: qué se decidió y por qué)\n' +
      '## Pendientes\n(viñetas breves: qué falta, en orden)\n' +
      'Sin introducción ni despedida. No inventes nada que no esté en la conversación.',
    copiarDesde: '──── copiar desde aquí ────',
    copiarHasta: '──── copiar hasta aquí ────',
    cabeceraCopia: 'Retomo una sesión anterior. Este es el resumen de traspaso; sigue desde los pendientes.',
    sugerencia:
      'Para ahorrar tokens, empieza una sesión nueva (/clear o una ventana nueva) y pega este texto como primer mensaje:',
  },
  en: {
    titulo: 'Handover summary',
    fecha: 'Date',
    origen: 'Source',
    auto: h => `automatic, after ${h} h of inactivity`,
    manual: 'on demand (/resumen)',
    objetivo: 'Goal',
    decisiones: 'Decisions made',
    archivos: 'Files touched',
    comandos: 'Commands run',
    errores: 'Errors seen',
    pendientes: 'Pending',
    ninguno: '(none)',
    sinModelo: '(not available: the model did not answer)',
    instrucciones:
      'Write a handover note for this coding session so it can be picked up in a new session. ' +
      'Answer in English, with only these three sections in this order, each with its exact heading:\n' +
      '## Goal\n(1 or 2 sentences: what is being achieved)\n' +
      '## Decisions made\n(short bullets: what was decided and why)\n' +
      '## Pending\n(short bullets: what is left, in order)\n' +
      'No introduction or sign-off. Do not invent anything that is not in the conversation.',
    copiarDesde: '──── copy from here ────',
    copiarHasta: '──── copy up to here ────',
    cabeceraCopia: 'I am resuming an earlier session. This is the handover summary; continue from the pending items.',
    sugerencia: 'To save tokens, start a new session (/clear or a new window) and paste this text as your first message:',
  },
}

const lista = (xs: readonly string[], vacio: string, codigo = false) =>
  xs.length === 0 ? vacio : xs.map(x => `- ${codigo ? `\`${x.replace(/`/g, "'")}\`` : x}`).join('\n')

// Prompt para el modelo: instrucciones, datos de herramientas y últimos mensajes.
export function construirPrompt(idioma: Idioma, hist: string, datos: Datos): string {
  const t = TEXTOS[idioma]
  const d = idioma === 'en' ? 'Tool data' : 'Datos de herramientas'
  const c = idioma === 'en' ? 'Last messages' : 'Últimos mensajes'
  return [
    t.instrucciones,
    '',
    `# ${d}`,
    `${t.archivos}:\n${lista(datos.archivos, t.ninguno)}`,
    `${t.comandos}:\n${lista(datos.comandos, t.ninguno)}`,
    `${t.errores}:\n${lista(datos.errores, t.ninguno)}`,
    '',
    `# ${c}`,
    hist || t.ninguno,
  ].join('\n')
}

export type Partes = { objetivo: string; decisiones: string; pendientes: string }

const CLAVES: [keyof Partes, RegExp][] = [
  ['objetivo', /^(objetivos?|goals?|objectives?)$/],
  ['decisiones', /^(decisiones( tomadas)?|decisions( made)?)$/],
  ['pendientes', /^(pendientes?|pending|next steps|to ?do|siguientes pasos)$/],
]

// Encabezado de sección: "## Objetivo", "**Objetivo**", "Objetivo:" en una línea propia.
const encabezado = (linea: string): string | null => {
  const m = /^\s{0,3}(?:#{1,6}\s*)?(?:\*\*)?([^*#:]{2,40}?)(?:\*\*)?\s*:?\s*(?:\*\*)?\s*$/.exec(linea)
  if (!m) return null
  if (!/^\s{0,3}(#|\*\*)/.test(linea) && !/:\s*$/.test(linea)) return null
  return (m[1] ?? '').trim().toLowerCase()
}

// Reparte la respuesta del modelo en las tres secciones que escribe. Una respuesta sin
// encabezados reconocibles va entera a "objetivo"; una vacía devuelve null.
export function parsear(texto: string): Partes | null {
  const limpio = texto.trim()
  if (!limpio) return null
  const partes: Partes = { objetivo: '', decisiones: '', pendientes: '' }
  let actual: keyof Partes | null | undefined = undefined // undefined: antes del primer encabezado
  let alguno = false
  const sueltas: string[] = []
  for (const linea of limpio.split('\n')) {
    const h = encabezado(linea)
    if (h !== null) {
      const k = CLAVES.find(([, re]) => re.test(h))?.[0]
      if (k) {
        actual = k
        alguno = true
        continue
      }
      if (/^\s{0,3}#/.test(linea)) {
        // Otra sección (archivos, comandos...): las escribe el mod con los datos reales.
        actual = null
        continue
      }
    }
    if (actual === undefined) sueltas.push(linea)
    else if (actual !== null) partes[actual] += `${linea}\n`
  }
  if (!alguno) return { objetivo: limpio, decisiones: '', pendientes: '' }
  if (sueltas.join('').trim() && !partes.objetivo.trim()) partes.objetivo = sueltas.join('\n')
  return { objetivo: partes.objetivo.trim(), decisiones: partes.decisiones.trim(), pendientes: partes.pendientes.trim() }
}

export type Meta = { fecha: string; origen: { tipo: 'auto'; horas: number } | { tipo: 'manual' } }

export const horasTexto = (h: number, idioma: Idioma) => {
  const r = Math.round(h * 10) / 10
  const s = Number.isInteger(r) ? String(r) : r.toFixed(1)
  return idioma === 'es' ? s.replace('.', ',') : s
}

// Texto final del resumen, en secciones fijas. Con partes null (el modelo no respondió), las
// secciones del modelo dicen que no están disponibles y las de datos siguen completas.
export function formatear(idioma: Idioma, partes: Partes | null, datos: Datos, meta: Meta, includeFiles: boolean): string {
  const t = TEXTOS[idioma]
  const sec = (titulo: string, cuerpo: string) => `## ${titulo}\n${cuerpo.trim() || t.ninguno}`
  const modelo = (s: string | undefined) => (partes === null ? t.sinModelo : s ?? '')
  const origen = meta.origen.tipo === 'auto' ? t.auto(horasTexto(meta.origen.horas, idioma)) : t.manual
  return [
    `# ${t.titulo}`,
    `${t.fecha}: ${meta.fecha}`,
    `${t.origen}: ${origen}`,
    '',
    sec(t.objetivo, modelo(partes?.objetivo)),
    '',
    sec(t.decisiones, modelo(partes?.decisiones)),
    '',
    ...(includeFiles ? [sec(t.archivos, lista(datos.archivos, t.ninguno)), ''] : []),
    sec(t.comandos, lista(datos.comandos, t.ninguno, true)),
    '',
    sec(t.errores, lista(datos.errores, t.ninguno)),
    '',
    sec(t.pendientes, modelo(partes?.pendientes)),
  ].join('\n')
}

// Mensaje de sugerencia de sesión nueva con el texto listo para copiar.
export function sugerencia(idioma: Idioma, resumen: string): string {
  const t = TEXTOS[idioma]
  return [t.sugerencia, '', t.copiarDesde, t.cabeceraCopia, '', resumen, t.copiarHasta].join('\n')
}

const dos = (n: number) => String(n).padStart(2, '0')

// Fecha local legible con su desfase: "2026-11-12 16:05 (UTC+01:00)".
export function fechaTexto(ms: number): string {
  const d = new Date(ms)
  const off = -d.getTimezoneOffset()
  const signo = off >= 0 ? '+' : '-'
  const a = Math.abs(off)
  return (
    `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())} ${dos(d.getHours())}:${dos(d.getMinutes())}` +
    ` (UTC${signo}${dos(Math.floor(a / 60))}:${dos(a % 60)})`
  )
}
