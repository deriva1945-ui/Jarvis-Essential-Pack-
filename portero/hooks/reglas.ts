// Capas de clasificación de portero. Solo funciones puras: sin $, sin disco ni red.
// El orden de las capas es: override, longitud, bloque de código, ruta de archivo,
// palabras clave, historial reciente y, si nada decide, el modelo ligero.

export type Ruta = 'ligera' | 'pesada' | 'dudosa'

// De dónde sale la decisión. "fallo" es la degradación: el clasificador no respondió.
export type Capa = 'override' | 'regla' | 'historial' | 'modelo' | 'fallo'

export type Decision = {
  ruta: Ruta
  capa: Capa
  // Nombre estable del motivo: "longitud", "palabra-pesada:depuracion", "modelo:ligera"...
  motivo: string
}

export type ReglaId = 'longitud' | 'codigo' | 'rutas' | 'palabras' | 'historial'

export type Config = {
  heavyModel: string
  classifierModel: string
  heavyLength: number
  lightLength: number
  reglas: Record<ReglaId, boolean>
  contextMessages: number
  contextChars: number
  dataDir: string
  logEnabled: boolean
  logMaxEntries: number
  logTextChars: number
}

export const DEFAULTS: Config = {
  heavyModel: 'opus',
  classifierModel: 'haiku',
  heavyLength: 600,
  lightLength: 200,
  reglas: { longitud: true, codigo: true, rutas: true, palabras: true, historial: true },
  contextMessages: 4,
  contextChars: 4000,
  dataDir: '~/CLAUDE/portero',
  logEnabled: true,
  logMaxEntries: 2000,
  logTextChars: 120,
}

export const HEAVY_MODELS = ['opus', 'fable'] as const

const num = (v: unknown, def: number, min: number, max: number): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  if (!Number.isFinite(n)) return def
  return Math.min(max, Math.max(min, Math.round(n)))
}
const bool = (v: unknown, def: boolean): boolean =>
  typeof v === 'boolean' ? v : v === 'true' ? true : v === 'false' ? false : def
const str = (v: unknown, def: string): string => (typeof v === 'string' && v.trim() !== '' ? v.trim() : def)

// Lee las opciones de userConfig con valores por defecto y límites razonables.
export function leerConfig(o: Readonly<Record<string, unknown>>): Config {
  const heavy = str(o['heavyModel'], DEFAULTS.heavyModel).toLowerCase()
  const lightLength = num(o['lightLength'], DEFAULTS.lightLength, 0, 100_000)
  return {
    heavyModel: (HEAVY_MODELS as readonly string[]).includes(heavy) ? heavy : DEFAULTS.heavyModel,
    classifierModel: str(o['classifierModel'], DEFAULTS.classifierModel),
    heavyLength: Math.max(lightLength, num(o['heavyLength'], DEFAULTS.heavyLength, 1, 100_000)),
    lightLength,
    reglas: {
      longitud: bool(o['ruleLength'], true),
      codigo: bool(o['ruleCode'], true),
      rutas: bool(o['rulePaths'], true),
      palabras: bool(o['ruleKeywords'], true),
      historial: bool(o['ruleHistory'], true),
    },
    contextMessages: num(o['contextMessages'], DEFAULTS.contextMessages, 0, 50),
    contextChars: num(o['contextChars'], DEFAULTS.contextChars, 0, 100_000),
    dataDir: str(o['dataDir'], DEFAULTS.dataDir),
    logEnabled: bool(o['logEnabled'], true),
    logMaxEntries: num(o['logMaxEntries'], DEFAULTS.logMaxEntries, 10, 100_000),
    logTextChars: num(o['logTextChars'], DEFAULTS.logTextChars, 0, 1000),
  }
}

// ---------------------------------------------------------------- overrides

const OVERRIDE = /^\s*!(pesada|ligera|dudosa)\b[\s:,.-]*/i

// "!pesada", "!ligera" o "!dudosa" al principio. Devuelve la ruta y el texto sin el atajo.
export function leerOverride(text: string): { ruta: Ruta; texto: string } | null {
  const m = OVERRIDE.exec(text)
  if (!m) return null
  const resto = text.slice(m[0].length)
  return { ruta: m[1]!.toLowerCase() as Ruta, texto: resto.trim() === '' ? text : resto }
}

// ---------------------------------------------------------------- reglas

export const PALABRAS_PESADAS: ReadonlyArray<{ grupo: string; re: RegExp }> = [
  { grupo: 'diseno', re: /arquitect|diseña|diseñ|rediseñ|migra|refactor|optimi[sz]a|rendimiento|performance|escalab/i },
  {
    grupo: 'depuracion',
    re: /depura|debug|\bbug|\berror|excepci[oó]n|exception|stack ?trace|traceback|\bfalla|crash|no funciona|race condition|deadlock|memory leak|fuga de memoria/i,
  },
  { grupo: 'analisis', re: /seguridad|security|vulnerab|concurren|analiza|análisis|investiga|por qu[eé] |audita|revisa (el|la|todo)|code review/i },
  { grupo: 'implementacion', re: /\b(implementa|construye|crea (un|una) (app|aplicaci[oó]n|servicio|api|m[oó]dulo|sistema)|escribe (un|una) (script|programa|test))/i },
  { grupo: 'multiarchivo', re: /\b(varios|m[uú]ltiples|todos los) (archivos|ficheros|m[oó]dulos)\b|todo el (proyecto|repo)/i },
]

export const PALABRAS_LIGERAS: ReadonlyArray<{ grupo: string; re: RegExp }> = [
  { grupo: 'traduccion', re: /^\s*(traduce|traduzca|translate|tradúceme|c[oó]mo se dice)\b/i },
  { grupo: 'formato', re: /^\s*(formatea|ordena|pon en (lista|tabla)|corrige la ortograf[ií]a|resume (esto|este texto)|reescribe)\b/i },
  { grupo: 'pregunta-corta', re: /^\s*¿?\s*(qu[eé] (es|significa)|cu[aá]l es|cu[aá]nto|cu[aá]ndo|d[oó]nde|qui[eé]n|what is|define)\b/i },
  { grupo: 'confirmacion', re: /^\s*(gracias|ok|vale|perfecto|genial|s[ií]|no|thanks|de acuerdo)\s*[.!]*\s*$/i },
]

const CODIGO = /```|^(?: {4}|\t)\S.*\n(?: {4}|\t)\S/m
const TRAZA = /^\s+at \S+ \(|^Traceback \(most recent call last\)|^\s*File ".+", line \d+/m
const RUTA_ARCHIVO =
  /(?:^|[\s"'`(])(?:\.{0,2}\/|~\/|[A-Za-z]:\\)?[\w@.-]+(?:[\\/][\w@.-]+)*\.(?:tsx?|jsx?|mjs|cjs|py|go|rs|java|kt|cs|cpp|cc|c|h|hpp|rb|php|sql|ya?ml|json|toml|sh|ps1|vue|svelte|swift)\b/i

// Seguimientos cortos que heredan la ruta pesada anterior: "y ahora los tests", "sigue", "hazlo"...
const SEGUIMIENTO =
  /^\s*(y\s|también|tambien|ahora\b|sigue|continúa|continua|contin[uú]a|hazlo|hazla|aplica|adelante|otra vez|repite|lo mismo|eso\b|esto\b|lo anterior|arr[eé]glalo|pru[eé]balo|vale,? (ahora|haz|sigue))/i

export type Historial = {
  // Ruta de la petición anterior de esta sesión, si la hay.
  rutaAnterior?: Ruta
  // Herramientas que usó el último mensaje del asistente.
  herramientasUltimo?: number
}

// Capa de reglas. Devuelve null si ninguna regla activa decide (pasa al modelo ligero).
export function clasificarPorReglas(text: string, cfg: Config, hist: Historial = {}): Decision | null {
  const t = text
  const r = cfg.reglas
  if (r.longitud && t.length > cfg.heavyLength) return { ruta: 'pesada', capa: 'regla', motivo: 'longitud' }
  if (r.codigo && (CODIGO.test(t) || TRAZA.test(t))) return { ruta: 'pesada', capa: 'regla', motivo: 'codigo' }
  if (r.rutas && RUTA_ARCHIVO.test(t)) return { ruta: 'pesada', capa: 'regla', motivo: 'ruta-archivo' }
  if (r.palabras) {
    const p = PALABRAS_PESADAS.find(x => x.re.test(t))
    if (p) return { ruta: 'pesada', capa: 'regla', motivo: `palabra-pesada:${p.grupo}` }
  }
  const corta = t.length < cfg.lightLength
  if (r.historial && corta) {
    const anteriorPesada = hist.rutaAnterior === 'pesada' || hist.rutaAnterior === 'dudosa'
    if (anteriorPesada && SEGUIMIENTO.test(t)) return { ruta: 'pesada', capa: 'historial', motivo: 'historial:seguimiento' }
    if (anteriorPesada && (hist.herramientasUltimo ?? 0) >= 3 && !PALABRAS_LIGERAS.some(x => x.re.test(t))) {
      return { ruta: 'pesada', capa: 'historial', motivo: 'historial:trabajo-en-curso' }
    }
  }
  if (r.palabras && corta) {
    const l = PALABRAS_LIGERAS.find(x => x.re.test(t))
    if (l) return { ruta: 'ligera', capa: 'regla', motivo: `palabra-ligera:${l.grupo}` }
  }
  return null
}

// Texto de /portero reglas: qué capas hay y cuáles están activas.
export function describirReglas(cfg: Config, carpeta: string): string {
  const on = (b: boolean) => (b ? '[x]' : '[ ]')
  const r = cfg.reglas
  return [
    'Reglas de portero (en orden):',
    `  [x] override         !pesada, !ligera, !dudosa al principio del mensaje`,
    `  ${on(r.longitud)} longitud         más de ${cfg.heavyLength} caracteres → pesada (ruleLength)`,
    `  ${on(r.codigo)} codigo           bloque de código o traza de error → pesada (ruleCode)`,
    `  ${on(r.rutas)} ruta-archivo     nombra un archivo de código (.ts, .py, .json...) → pesada (rulePaths)`,
    `  ${on(r.palabras)} palabra-pesada   ${PALABRAS_PESADAS.map(p => p.grupo).join(', ')} → pesada (ruleKeywords)`,
    `  ${on(r.historial)} historial        seguimiento corto tras una ruta pesada → pesada (ruleHistory)`,
    `  ${on(r.palabras)} palabra-ligera   ${PALABRAS_LIGERAS.map(p => p.grupo).join(', ')}, con menos de ${cfg.lightLength} caracteres → ligera`,
    `  [x] modelo           el resto lo decide ${cfg.classifierModel}: ligera, pesada o dudosa`,
    `  [x] fallo            si el clasificador falla → pesada, con aviso en el registro`,
    '',
    `Modelo pesado: ${cfg.heavyModel}. Contexto a subagentes: ${cfg.contextMessages} mensajes, ${cfg.contextChars} caracteres (el doble con dudosa).`,
    `Registro: ${cfg.logEnabled ? carpeta : 'desactivado (logEnabled)'}`,
  ].join('\n')
}

// ---------------------------------------------------------------- contexto para subagentes

export type Mensaje = { role: 'user' | 'assistant'; text: string; toolUses?: readonly unknown[] }

const VACIO_O_TRIVIAL = /^\s*(gracias|ok|vale|perfecto|genial|s[ií]|no|thanks|de acuerdo)?\s*[.!]*\s*$/i

// Elige los mensajes recientes que el subagente necesita: sin vacíos, sin confirmaciones,
// sin el propio mensaje actual ni atajos sueltos; los más recientes primero hasta el límite
// de mensajes y de caracteres. Devuelve '' si no hay nada útil.
export function contextoReciente(msgs: readonly Mensaje[], actual: string, maxMensajes: number, maxChars: number): string {
  if (maxMensajes <= 0 || maxChars <= 0) return ''
  const actualNorm = actual.trim()
  const elegidos: string[] = []
  let usados = 0
  for (let i = msgs.length - 1; i >= 0 && elegidos.length < maxMensajes; i--) {
    const m = msgs[i]!
    const text = (m.text ?? '').trim()
    if (VACIO_O_TRIVIAL.test(text)) continue
    if (m.role === 'user' && (text === actualNorm || OVERRIDE.test(text) && text.replace(OVERRIDE, '').trim() === actualNorm)) continue
    const cabecera = m.role === 'user' ? 'Usuario: ' : 'Asistente: '
    const libre = maxChars - usados - cabecera.length
    if (libre <= 20) break
    const cuerpo = text.length > libre ? text.slice(0, libre - 1) + '…' : text
    elegidos.push(cabecera + cuerpo)
    usados += cabecera.length + cuerpo.length
  }
  return elegidos.reverse().join('\n---\n')
}

// ---------------------------------------------------------------- recorte para el registro

const SECRETOS: ReadonlyArray<RegExp> = [
  /\b(sk|pk|rk)-[A-Za-z0-9_-]{12,}/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g,
  /\b(password|passwd|contraseña|token|secret|api[_-]?key)\s*[:=]\s*\S+/gi,
  /[\w.+-]+@[\w-]+\.[\w.-]+/g,
  /\b[A-Fa-f0-9]{32,}\b/g,
]

// Texto que se guarda en el registro: una línea, recortado y con secretos evidentes tapados.
export function recortar(text: string, max: number): string {
  let t = text.replace(/\s+/g, ' ').trim()
  for (const re of SECRETOS) t = t.replace(re, '[oculto]')
  if (max <= 0) return ''
  return t.length > max ? t.slice(0, max - 1) + '…' : t
}
