import type { Acumulado, AcumCifras, Cifras, DiaHist, Historico, SesionHist, TurnoHist } from '../types'

// Histórico entre sesiones (historico.json en la carpeta de datos). Solo cifras y nombres de modelos y de
// tipos de agente: nunca el texto de las peticiones ni las descripciones de los subagentes.
// Funciones puras: register.tsx lee el archivo, las llama y lo vuelve a escribir.

export const HISTORICO_VERSION = 1
// Sesiones que se guardan una a una; las más antiguas se suman en sesionesAnteriores.
export const SESIONES_MAX = 200
// Turnos recordados (sesión:turno) para no sumar dos veces un turn.complete repetido.
export const IDS_MAX = 1000
// Sesiones que van a datos.js para la lista del HUD.
export const SESIONES_HUD = 6

const r6 = (x: number) => Math.round(x * 1e6) / 1e6

export const cifras0 = (): Cifras => ({ coste: 0, entrada: 0, salida: 0, cache: 0, cacheEscritura: 0, turnos: 0 })

const sumarCifras = (a: Cifras, b: Cifras): Cifras => ({
  coste: r6(a.coste + b.coste),
  entrada: a.entrada + b.entrada,
  salida: a.salida + b.salida,
  cache: a.cache + b.cache,
  cacheEscritura: a.cacheEscritura + b.cacheEscritura,
  turnos: a.turnos + b.turnos,
})

const sumarMapa = (m: Record<string, Cifras>, k: string, c: Cifras): Record<string, Cifras> => ({
  ...m,
  [k]: sumarCifras(m[k] ?? cifras0(), c),
})

export const nuevo = (): Historico => ({
  version: HISTORICO_VERSION,
  desde: null,
  actualizado: 0,
  total: { ...cifras0(), modelos: {}, agentes: {} },
  anteriores: { ...cifras0(), dias: 0, hasta: null },
  dias: {},
  sesiones: [],
  sesionesAnteriores: { sesiones: 0, coste: 0, turnos: 0 },
  turnos: [],
})

const dos = (n: number) => (n < 10 ? '0' : '') + n

// Día AAAA-MM-DD en hora local.
export const diaDe = (ms: number): string => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
}

// Días de la semana en curso (lunes a hoy), en hora local.
export const diasSemana = (ms: number): string[] => {
  const d = new Date(ms)
  const desdeLunes = (d.getDay() + 6) % 7
  const out: string[] = []
  for (let i = desdeLunes; i >= 0; i--) out.push(diaDe(new Date(d.getFullYear(), d.getMonth(), d.getDate() - i, 12).getTime()))
  return out
}

// Día que queda justo fuera de la retención: con retencion = 1 solo se queda hoy.
const corte = (hoy: number, retencion: number): string => {
  const d = new Date(hoy)
  return diaDe(new Date(d.getFullYear(), d.getMonth(), d.getDate() - retencion, 12).getTime())
}

const esNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
const esObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)
const esCifras = (x: unknown): x is Cifras =>
  esObj(x) && ['coste', 'entrada', 'salida', 'cache', 'cacheEscritura', 'turnos'].every(k => esNum(x[k]))
const esMapa = (x: unknown) => esObj(x) && Object.values(x).every(esCifras)

// Comprueba la forma de un historico.json ya parseado. null si no vale (se respalda y se empieza otro).
export const validar = (x: unknown): Historico | null => {
  if (!esObj(x) || x['version'] !== HISTORICO_VERSION) return null
  const t = x['total'], a = x['anteriores'], d = x['dias'], s = x['sesiones'], sa = x['sesionesAnteriores'], ids = x['turnos']
  if (!esCifras(t) || !esMapa((t as Record<string, unknown>)['modelos']) || !esMapa((t as Record<string, unknown>)['agentes'])) return null
  if (!esCifras(a) || !esNum((a as Record<string, unknown>)['dias'])) return null
  if (!esObj(d) || !Object.values(d).every(v => esCifras(v) && esMapa((v as Record<string, unknown>)['modelos']))) return null
  if (!Array.isArray(s) || !s.every(v => esObj(v) && typeof v['id'] === 'string' && esNum(v['inicio']) && esNum(v['fin']) && esNum(v['coste']) && esNum(v['turnos'])))
    return null
  if (!esObj(sa) || !esNum(sa['sesiones']) || !esNum(sa['coste']) || !esNum(sa['turnos'])) return null
  if (!Array.isArray(ids) || !ids.every(v => typeof v === 'string')) return null
  if (x['desde'] !== null && !esNum(x['desde'])) return null
  return x as unknown as Historico
}

// Lee el texto de historico.json. roto: el texto no es un histórico válido (hay que respaldarlo).
export const parsear = (texto: string): { h: Historico; roto: boolean } => {
  try {
    const h = validar(JSON.parse(texto))
    return h ? { h, roto: false } : { h: nuevo(), roto: true }
  } catch {
    return { h: nuevo(), roto: true }
  }
}

const modeloPrincipal = (m: Record<string, number>): string => {
  let best = '', n = -1
  for (const k of Object.keys(m)) if ((m[k] ?? 0) > n) [best, n] = [k, m[k] ?? 0]
  return best
}

// Suma un turno al histórico. nuevo:false si ese turno (de esa sesión) ya estaba: no cambia nada.
export const sumarTurno = (h: Historico, t: TurnoHist): { h: Historico; nuevo: boolean } => {
  const clave = `${t.sesion}:${t.id}`
  if (h.turnos.includes(clave)) return { h, nuevo: false }
  const c: Cifras = {
    coste: t.coste !== null && Number.isFinite(t.coste) && t.coste > 0 ? r6(t.coste) : 0,
    entrada: t.entrada,
    salida: t.salida,
    cache: t.cache,
    cacheEscritura: t.cacheEscritura,
    turnos: 1,
  }
  const dia = diaDe(t.at)
  const d0: DiaHist = h.dias[dia] ?? { ...cifras0(), modelos: {} }
  const dias = { ...h.dias, [dia]: { ...sumarCifras(d0, c), modelos: sumarMapa(d0.modelos, t.modelo, c) } }

  const i = h.sesiones.findIndex(s => s.id === t.sesion)
  const s0: SesionHist = i >= 0 ? (h.sesiones[i] as SesionHist) : { id: t.sesion, inicio: t.inicio, fin: t.at, coste: 0, turnos: 0, modelo: '', modelos: {} }
  const modelos = { ...s0.modelos, [t.modelo]: (s0.modelos[t.modelo] ?? 0) + 1 }
  const s1: SesionHist = {
    ...s0,
    inicio: Math.min(s0.inicio, t.inicio),
    fin: Math.max(s0.fin, t.at),
    coste: r6(s0.coste + c.coste),
    turnos: s0.turnos + 1,
    modelos,
    modelo: modeloPrincipal(modelos),
  }
  const sesiones = i >= 0 ? h.sesiones.map((s, j) => (j === i ? s1 : s)) : [...h.sesiones, s1]

  return {
    nuevo: true,
    h: {
      ...h,
      desde: h.desde === null ? t.inicio : Math.min(h.desde, t.inicio),
      actualizado: Math.max(h.actualizado, t.at),
      total: {
        ...sumarCifras(h.total, c),
        modelos: sumarMapa(h.total.modelos, t.modelo, c),
        agentes: sumarMapa(h.total.agentes, t.agente, c),
      },
      dias,
      sesiones,
      turnos: [...h.turnos, clave].slice(-IDS_MAX),
    },
  }
}

// Marca el fin de una sesión (session.end). Sin turnos guardados de esa sesión no hay nada que cerrar.
export const cerrarSesion = (h: Historico, sesion: string, fin: number): { h: Historico; cambiado: boolean } => {
  const i = h.sesiones.findIndex(s => s.id === sesion)
  const s = h.sesiones[i]
  if (!s || fin <= s.fin) return { h, cambiado: false }
  return { cambiado: true, h: { ...h, sesiones: h.sesiones.map((x, j) => (j === i ? { ...x, fin } : x)) } }
}

// Retención: los días más antiguos que retencion (contando hoy) se suman en anteriores, y las sesiones de
// más de SESIONES_MAX en sesionesAnteriores. El total desde el primer uso no cambia.
export const recortar = (h: Historico, retencion: number, hoy: number): Historico => {
  const limite = corte(hoy, Math.max(1, Math.floor(retencion)))
  const viejos = Object.keys(h.dias).filter(k => k <= limite).sort()
  let anteriores = h.anteriores
  let dias = h.dias
  if (viejos.length > 0) {
    dias = { ...h.dias }
    for (const k of viejos) {
      const d = dias[k] as DiaHist
      anteriores = { ...sumarCifras(anteriores, d), dias: anteriores.dias + 1, hasta: anteriores.hasta && anteriores.hasta > k ? anteriores.hasta : k }
      delete dias[k]
    }
  }
  let sesiones = h.sesiones
  let sa = h.sesionesAnteriores
  if (sesiones.length > SESIONES_MAX) {
    const fuera = sesiones.slice(0, sesiones.length - SESIONES_MAX)
    sesiones = sesiones.slice(-SESIONES_MAX)
    sa = fuera.reduce((a, s) => ({ sesiones: a.sesiones + 1, coste: r6(a.coste + s.coste), turnos: a.turnos + s.turnos }), sa)
  }
  return viejos.length === 0 && sesiones === h.sesiones ? h : { ...h, anteriores, dias, sesiones, sesionesAnteriores: sa }
}

const acum = (c: Cifras): AcumCifras => ({ coste: r6(c.coste), turnos: c.turnos, entrada: c.entrada, salida: c.salida, cache: c.cache })

// Lo que va a datos.js como bloque "acumulado": total, hoy, semana y las últimas sesiones.
export const resumir = (h: Historico, ahora: number, sesionActual?: string): Acumulado => {
  const hoy = h.dias[diaDe(ahora)] ?? cifras0()
  const semana = diasSemana(ahora).reduce((a, k) => (h.dias[k] ? sumarCifras(a, h.dias[k] as Cifras) : a), cifras0())
  const total = h.sesiones.length + h.sesionesAnteriores.sesiones
  return {
    desde: h.desde,
    total: acum(h.total),
    hoy: acum(hoy),
    semana: acum(semana),
    dias: Object.keys(h.dias).length + h.anteriores.dias,
    sesionesTotales: total,
    sesiones: h.sesiones
      .slice(-SESIONES_HUD)
      .reverse()
      .map(s => ({ inicio: s.inicio, fin: s.fin, duracion: Math.max(0, s.fin - s.inicio), coste: s.coste, turnos: s.turnos, modelo: s.modelo, actual: s.id === sesionActual })),
  }
}
