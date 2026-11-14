import { expect, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

import type { Historico } from '../types'
import { HISTORICO_DEFAULT, leerHistorico } from './config'
import { diaDe, diasSemana, IDS_MAX, nuevo, parsear, recortar, resumir, SESIONES_MAX, sumarTurno } from './historico'
import { EN, traducir } from './idioma'
import { PAGE } from './page'

// Histórico entre sesiones (historico.json). El disco es un objeto en memoria: fs.read, fs.write y fs.exists
// del test lo leen y lo cambian. Los tests no tocan ninguna ruta real.

type On = Parameters<TestBody>[1]
type Dollar = Parameters<TestBody>[0]

const DIR = '/prueba/consumo'
const H = `${DIR}/historico.json`
const HT = `${DIR}/historico.tmp.json`
const PRUEBA = { options: { dataDir: DIR } }
const ok = { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
// Mediodía local de un jueves: hoy y esta semana no dependen de la zona horaria de la máquina.
const T0 = new Date(2026, 10, 12, 12, 0, 0).getTime()
const HORA = 3_600_000
const DIA = 24 * HORA

type Escritura = { path: string; text: string }

// Monta el motor de prueba: disco en memoria, reloj, sesión con id cambiable y contador de coste.
function motor(on: On, disco: Record<string, string>, ini: { usd: number; sid: string }) {
  // Reloj propio (sin latido): saltar un día con mock.clock dispararía miles de latidos de 3 s.
  const estado = { ...ini, now: T0 }
  on('clock.now', () => ({ value: estado.now }))
  on('clock.every', () => ({ value: undefined }) as never)
  const clock = { advance: async (ms: number) => void (estado.now += ms) }
  const writes: Escritura[] = []
  const reads: string[] = []
  const logs: string[] = []
  on('fs.write', (_, e) => {
    writes.push(e)
    disco[e.path] = e.text
    return { value: undefined }
  })
  on('fs.read', (_, e) => {
    reads.push(e.path)
    const t = disco[e.path]
    if (t === undefined) throw new Error(`ENOENT: ${e.path}`)
    return { value: t }
  })
  on('fs.exists', (_, e) => ({ value: e.path in disco }))
  on('ui.log', (_, e) => {
    logs.push(e.text)
    return { value: undefined }
  })
  on('process.run', () => ok)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.end', (_, e) => ({ sessionId: e.sessionId }))
  on('session.id', () => ({ value: estado.sid }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { tokens: 10, window: 100, percent: 10 }, rateLimits: [], cost: { usd: estado.usd } },
  }))
  on('turn.complete', () => ({ text: '' }))
  const datos = () => {
    const w = writes.filter(x => x.path === `${DIR}/datos.js`).at(-1)
    return JSON.parse((w?.text ?? '').replace(/^window\.CONSUMO = /, '').replace(/;$/, ''))
  }
  const historico = (): Historico => JSON.parse(disco[H] ?? 'null') as Historico
  return { clock, writes, reads, logs, estado, datos, historico }
}

const turno = (turnId: string, model: string, input: number, output: number, agentId?: string) =>
  ({
    answer: '',
    durationMs: 1000,
    isAborted: false,
    reason: 'answer',
    turnId,
    ...(agentId ? { agentId } : {}),
    usage: { model, input_tokens: input, output_tokens: output, cache_read_input_tokens: 5, cache_creation_input_tokens: 1 },
  }) as const

const arrancar = ($: Dollar) => $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
const cerrar = ($: Dollar, sessionId: string) => $.session.end({ reason: 'prompt_input_exit', sessionId, resume: { id: sessionId } })

test('histórico: primer uso, sin archivo, empieza vacío y el primer turno escribe el temporal y después el archivo', PRUEBA, async ($, on) => {
  const disco: Record<string, string> = {}
  const m = motor(on, disco, { usd: 0, sid: 's1' })
  await arrancar($)
  // Nada que guardar todavía: al arrancar no se escribe el histórico.
  expect(m.writes.some(w => w.path.includes('historico'))).toBe(false)
  const a = m.datos().acumulado
  expect(a.desde).toBe(null)
  expect(a.total).toEqual({ coste: 0, turnos: 0, entrada: 0, salida: 0, cache: 0 })
  expect(a.hoy.turnos).toBe(0)
  expect(a.sesiones).toEqual([])

  m.estado.usd = 0.1
  await $.turn.complete(turno('t1', 'claude-opus-5', 100, 20))
  const orden = m.writes.map(w => w.path).filter(p => p.includes('historico'))
  expect(orden).toEqual([HT, H])
  expect(disco[HT]).toBe(disco[H])
  const h = m.historico()
  expect(h.version).toBe(1)
  expect(h.total.turnos).toBe(1)
  expect(h.total.coste).toBe(0.1)
  expect(h.total.agentes['principal']?.turnos).toBe(1)
  expect(h.dias[diaDe(T0)]?.turnos).toBe(1)
  expect(m.datos().acumulado.hoy.coste).toBe(0.1)
})

test('histórico: dos sesiones suman lo mismo que sus turnos (por sesión, por día y en total)', PRUEBA, async ($, on) => {
  const disco: Record<string, string> = {}
  const m = motor(on, disco, { usd: 0, sid: 's1' })
  const vistos: { coste: number; entrada: number; salida: number }[] = []
  const sumar = async (id: string, usd: number, model: string, input: number, output: number, agentId?: string) => {
    m.estado.usd = usd
    await $.turn.complete(turno(id, model, input, output, agentId))
    const h = m.datos().historial.at(-1)
    vistos.push({ coste: h.coste ?? 0, entrada: input, salida: output })
  }

  // Sesión 1: hoy, dos horas, con un subagente.
  await arrancar($)
  m.estado.usd = 0
  await sumar('a1', 0.25, 'claude-opus-5', 1000, 200)
  await m.clock.advance(HORA)
  await sumar('a2', 0.3, 'claude-haiku-5-5', 400, 50, 'ag1')
  await m.clock.advance(HORA)
  await sumar('a3', 0.75, 'claude-opus-5', 2000, 300)
  // Diez minutos sin turnos y se cierra: el fin es la hora del cierre, no la del último turno.
  await m.clock.advance(10 * 60_000)
  await cerrar($, 's1')
  const fin1 = T0 + 2 * HORA + 10 * 60_000

  // Sesión 2: mañana, otro proceso (el contador de coste vuelve a empezar).
  await m.clock.advance(DIA)
  m.estado.sid = 's2'
  m.estado.usd = 0
  await arrancar($)
  // Al arrancar ya trae lo de ayer.
  expect(m.datos().acumulado.total.turnos).toBe(3)
  await sumar('b1', 0.5, 'claude-opus-5', 800, 100)
  await m.clock.advance(HORA)
  await sumar('b2', 1.25, 'claude-opus-5', 3000, 400)
  await cerrar($, 's2')

  const h = m.historico()
  const r6 = (x: number) => Math.round(x * 1e6) / 1e6
  const coste = r6(vistos.reduce((a, x) => a + x.coste, 0))
  expect(coste).toBe(2)
  expect(h.total.coste).toBe(coste)
  expect(h.total.turnos).toBe(5)
  expect(h.total.entrada).toBe(vistos.reduce((a, x) => a + x.entrada, 0))
  expect(h.total.salida).toBe(vistos.reduce((a, x) => a + x.salida, 0))
  expect(h.total.cache).toBe(25)
  expect(h.total.cacheEscritura).toBe(5)
  // Por sesión: la suma de las sesiones es el total.
  expect(h.sesiones.map(s => s.id)).toEqual(['s1', 's2'])
  expect(r6(h.sesiones.reduce((a, s) => a + s.coste, 0))).toBe(coste)
  expect(h.sesiones[0]?.coste).toBe(0.75)
  expect(h.sesiones[0]?.turnos).toBe(3)
  expect(h.sesiones[0]?.modelo).toBe('claude-opus-5')
  // session.end apunta la hora de cierre.
  expect(h.sesiones[0]?.fin).toBe(fin1)
  // Por día: dos días y la suma de los días es el total.
  expect(Object.keys(h.dias).sort()).toEqual([diaDe(T0), diaDe(T0 + DIA)].sort())
  expect(r6(Object.values(h.dias).reduce((a, d) => a + d.coste, 0))).toBe(coste)
  expect(h.dias[diaDe(T0 + DIA)]?.turnos).toBe(2)
  // Por modelo y por tipo de agente.
  expect(h.total.modelos['claude-haiku-5-5']?.turnos).toBe(1)
  expect(h.total.modelos['claude-opus-5']?.turnos).toBe(4)
  // Un subagente sin spawn visto (sin tipo conocido) cuenta como "subagente".
  expect(h.total.agentes['subagente']?.turnos).toBe(1)
  expect(h.total.agentes['principal']?.turnos).toBe(4)

  // datos.js: total, hoy (el día de la sesión 2) y las sesiones, la actual primero.
  const a = m.datos().acumulado
  expect(a.total.coste).toBe(coste)
  expect(a.hoy.coste).toBe(1.25)
  expect(a.sesionesTotales).toBe(2)
  expect(a.sesiones[0].actual).toBe(true)
  expect(a.sesiones[1].duracion).toBe(2 * HORA + 10 * 60_000)
})

test('histórico: un turno repetido no suma dos veces (ni en el mismo proceso ni leyendo el archivo)', PRUEBA, async ($, on) => {
  const disco: Record<string, string> = {}
  const m = motor(on, disco, { usd: 0, sid: 's1' })
  await arrancar($)
  m.estado.usd = 0.2
  await $.turn.complete(turno('t1', 'claude-opus-5', 100, 10))
  await $.turn.complete(turno('t1', 'claude-opus-5', 100, 10))
  // En paralelo: la cola del histórico evita que dos escrituras se pisen.
  m.estado.usd = 0.4
  await Promise.all([$.turn.complete(turno('t2', 'claude-opus-5', 50, 5, 'x')), $.turn.complete(turno('t3', 'claude-opus-5', 50, 5, 'y'))])
  const h = m.historico()
  expect(h.total.turnos).toBe(3)
  expect([...h.turnos].sort()).toEqual(['s1:t1', 's1:t2', 's1:t3'])

  // Puro: el mismo turno otra vez no cambia nada.
  const t = { id: 'z', sesion: 's9', inicio: T0, at: T0, modelo: 'm', agente: 'principal', entrada: 1, salida: 1, cache: 0, cacheEscritura: 0, coste: 0.5 }
  const r1 = sumarTurno(nuevo(), t)
  const r2 = sumarTurno(r1.h, t)
  expect(r2.nuevo).toBe(false)
  expect(r2.h).toBe(r1.h)
  // La lista de ids no crece sin fin.
  let x = nuevo()
  for (let i = 0; i < IDS_MAX + 5; i++) x = sumarTurno(x, { ...t, id: `n${i}` }).h
  expect(x.turnos).toHaveLength(IDS_MAX)
})

test('histórico: un JSON roto se copia en historico.roto-<fecha>.json y se empieza de cero sin fallar', PRUEBA, async ($, on) => {
  const disco: Record<string, string> = { [H]: '{"version":1,"total":{"coste":3' }
  const m = motor(on, disco, { usd: 0, sid: 's1' })
  await arrancar($)
  const copia = m.writes.find(w => /historico\.roto-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.json$/.test(w.path))
  expect(copia?.text).toBe('{"version":1,"total":{"coste":3')
  expect(m.logs.some(l => l.startsWith('consumo:') && l.includes('historico.roto-'))).toBe(true)
  expect(m.datos().acumulado.total.turnos).toBe(0)
  m.estado.usd = 0.1
  await $.turn.complete(turno('t1', 'claude-opus-5', 10, 1))
  expect(parsear(disco[H] ?? '').roto).toBe(false)
  expect(m.historico().total.turnos).toBe(1)
  // Un JSON válido con otra forma también cuenta como roto.
  expect(parsear('{"a":1}').roto).toBe(true)
  expect(parsear('[]').roto).toBe(true)
})

test('histórico: si historico.json se cortó a medias, se recupera historico.tmp.json', PRUEBA, async ($, on) => {
  let h = nuevo()
  h = sumarTurno(h, { id: 'v', sesion: 's0', inicio: T0 - DIA, at: T0 - DIA, modelo: 'm', agente: 'principal', entrada: 7, salida: 3, cache: 0, cacheEscritura: 0, coste: 2 }).h
  const disco: Record<string, string> = { [H]: JSON.stringify(h).slice(0, 40), [HT]: JSON.stringify(h) }
  const m = motor(on, disco, { usd: 0, sid: 's1' })
  await arrancar($)
  expect(m.datos().acumulado.total.coste).toBe(2)
  expect(m.writes.some(w => w.path.includes('historico.roto-'))).toBe(true)
})

test('histórico: la retención pasa los días antiguos a un total sin cambiar el acumulado', { options: { dataDir: DIR, retencionDias: 2 } }, async ($, on) => {
  let h = nuevo()
  const t = (id: string, at: number, coste: number) => ({ id, sesion: 'viejo', inicio: at, at, modelo: 'm', agente: 'principal', entrada: 10, salida: 1, cache: 0, cacheEscritura: 0, coste })
  h = sumarTurno(h, t('d5', T0 - 5 * DIA, 1)).h
  h = sumarTurno(h, t('d3', T0 - 3 * DIA, 2)).h
  h = sumarTurno(h, t('d1', T0 - DIA, 4)).h
  const disco: Record<string, string> = { [H]: JSON.stringify(h) }
  const m = motor(on, disco, { usd: 0, sid: 's1' })
  await arrancar($)
  m.estado.usd = 0.5
  await $.turn.complete(turno('hoy', 'claude-opus-5', 10, 1))
  const r = m.historico()
  // Con 2 días se quedan ayer y hoy; los otros dos van a anteriores.
  expect(Object.keys(r.dias).sort()).toEqual([diaDe(T0 - DIA), diaDe(T0)].sort())
  expect(r.anteriores.dias).toBe(2)
  expect(r.anteriores.coste).toBe(3)
  expect(r.anteriores.hasta).toBe(diaDe(T0 - 3 * DIA))
  expect(r.total.coste).toBe(7.5)
  expect(m.datos().acumulado.total.coste).toBe(7.5)
  expect(m.datos().acumulado.dias).toBe(4)

  // Puro: las sesiones de más se suman en sesionesAnteriores.
  let x = nuevo()
  for (let i = 0; i < SESIONES_MAX + 3; i++) x = sumarTurno(x, { ...t(`s${i}`, T0, 1), sesion: `s${i}` }).h
  const y = recortar(x, 365, T0)
  expect(y.sesiones).toHaveLength(SESIONES_MAX)
  expect(y.sesionesAnteriores).toEqual({ sesiones: 3, coste: 3, turnos: 3 })
  expect(resumir(y, T0).sesionesTotales).toBe(SESIONES_MAX + 3)
  expect(resumir(y, T0).total.coste).toBe(SESIONES_MAX + 3)
  // Sin nada que recortar devuelve el mismo objeto (y no se reescribe el archivo).
  expect(recortar(y, 365, T0)).toBe(y)
})

test('histórico: con historico = false no se lee ni se escribe nada y datos.js lleva acumulado null', { options: { dataDir: DIR, historico: false } }, async ($, on) => {
  const disco: Record<string, string> = { [H]: JSON.stringify(nuevo()) }
  const m = motor(on, disco, { usd: 0, sid: 's1' })
  await arrancar($)
  m.estado.usd = 0.3
  await $.turn.complete(turno('t1', 'claude-opus-5', 10, 1))
  await cerrar($, 's1')
  expect(m.writes.some(w => w.path.includes('historico'))).toBe(false)
  expect(m.reads.some(p => p.includes('historico'))).toBe(false)
  expect(m.datos().acumulado).toBe(null)
  expect(m.datos().historial).toHaveLength(1)
})

test('histórico: opciones historico y retencionDias, con aviso para los valores que no valen', () => {
  expect(leerHistorico({}).config).toEqual(HISTORICO_DEFAULT)
  expect(HISTORICO_DEFAULT).toEqual({ activo: true, retencionDias: 365 })
  expect(leerHistorico({ historico: false, retencionDias: 30 }).config).toEqual({ activo: false, retencionDias: 30 })
  expect(leerHistorico({ historico: 'false' }).config.activo).toBe(false)
  const mal = leerHistorico({ historico: 'quizá', retencionDias: 0 })
  expect(mal.config).toEqual(HISTORICO_DEFAULT)
  expect(mal.avisos).toHaveLength(2)
  expect(leerHistorico({ retencionDias: 2.5 }).avisos).toHaveLength(1)
  expect(leerHistorico({ retencionDias: 3651 }).config.retencionDias).toBe(365)
})

test('histórico: el bloque Acumulado está en la página y en datos.js, con su sitio en la rejilla', PRUEBA, async ($, on) => {
  const disco: Record<string, string> = {}
  const m = motor(on, disco, { usd: 0, sid: 's1' })
  await arrancar($)
  m.estado.usd = 0.2
  await $.turn.complete(turno('t1', 'claude-opus-5', 10, 1))
  const a = m.datos().acumulado
  expect(Object.keys(a).sort()).toEqual(['desde', 'dias', 'hoy', 'semana', 'sesiones', 'sesionesTotales', 'total'])
  expect(a.semana.coste).toBe(0.2)
  expect(a.sesiones).toHaveLength(1)
  expect(Object.keys(a.sesiones[0]).sort()).toEqual(['actual', 'coste', 'duracion', 'fin', 'inicio', 'modelo', 'turnos'])

  for (const id of ['p-acum', 'achoy', 'acsem', 'actot', 'acses', 'acdesde']) expect(PAGE).toContain(`id="${id}"`)
  expect(PAGE).toContain('renderAcum(d);')
  expect(PAGE).toContain("ponClase($id('p-acum'),'ac-off',!a);")
  expect(PAGE).toContain('#p-acum{grid-area:acum}')
  // Prioridad: detrás del plan y delante de los últimos turnos; en compacto sin la lista de sesiones.
  for (const l of PAGE.split('\n')) {
    if (!l.includes('grid-template-areas:"head') || l.includes('none') || l.includes('ac-sin')) continue
    expect(l).toContain('acum')
    const i = l.indexOf('acum'), p = l.indexOf('plan'), hi = l.indexOf('hist')
    expect(p >= 0 && p < i).toBe(true)
    if (hi >= 0) expect(i < hi).toBe(true)
  }
  expect(PAGE).toContain('html[data-densidad="compacto"] .acs{display:none}')
  // Sin histórico, en pantalla grande la gráfica y los turnos recuperan el sitio del acumulado.
  expect(PAGE).toContain(`html[data-tema="natural"] body.ac-sin:not(.pn-sel) .wrap{grid-template-areas:"head head head" "plan plan plan" "ctx cost comp" "mod chart chart" "agt hist hist" "foot foot foot"}`)
  expect(PAGE).toContain("ponClase(document.body,'ac-sin',!a);")
  // Textos traducidos.
  const tr = (s: string) => traducir(s, EN)
  expect(tr('Últimas sesiones')).toBe('Latest sessions')
  expect(tr('Esta semana')).toBe('This week')
  expect(tr('Modelo de la sesión')).toBe('Session model')
  expect(tr('desde 3 nov · 4 sesiones')).toBe('since 3 nov · 4 sessions')
})

test('histórico: hoy y esta semana en hora local, de lunes a hoy', () => {
  const jueves = new Date(2026, 10, 12, 12).getTime()
  expect(diaDe(jueves)).toBe('2026-11-12')
  expect(diasSemana(jueves)).toEqual(['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12'])
  const lunes = new Date(2026, 10, 9, 0, 5).getTime()
  expect(diasSemana(lunes)).toEqual(['2026-11-09'])
  const domingo = new Date(2026, 10, 15, 23, 50).getTime()
  expect(diasSemana(domingo)).toHaveLength(7)
})
