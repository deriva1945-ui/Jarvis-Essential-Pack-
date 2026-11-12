import { expect, mock, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

import { calcular, COMP0, sumar } from './comparativa'
import { CONFIG_DEFAULT, leerConfig, PANELES } from './config'
import { observe } from './ledger'
import { PAGE } from './page'
import { actualizar, crear, idCreada, PLAN0, resumen } from './plan'
import { DATA_DIR_DEFAULT, expandir, fileUrl, unir } from './rutas'
import { alCargar, alFallar, aplicaTema, LOGICA, nuevoEstado, senal, valido } from './senal'

// Carpeta de prueba para la opción dataDir: los tests no dependen de ninguna ruta real.
const PRUEBA = { options: { dataDir: '/prueba/consumo' } }

const ok = { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }

test('the page has the key sections, the size breakpoints and the density toggle', () => {
  for (const id of ['p-plan', 'plfill', 'pll', 'p-ctx', 'p-cost', 'p-mod', 'p-chart', 'p-hist', 'p-agt', 'dens']) {
    expect(PAGE).toContain(`id="${id}"`)
  }
  expect(PAGE).toContain('Reparto por modelo')
  expect(PAGE).toContain('datos.js')
  expect(PAGE).toContain('@media (min-width:1600px)')
  expect(PAGE).toContain('@media (min-width:900px)')
  expect(PAGE).toContain('@media (max-width:899px)')
  expect(PAGE).toContain('localStorage')
  expect(PAGE).toContain('text-overflow:ellipsis')
  // Etiquetas >= 14 px y valores >= 16 px.
  expect(PAGE).toContain('--fk:clamp(14px,')
  expect(PAGE).toContain('--fv:clamp(16px,')
  expect(PAGE).not.toContain('#6b7a90')
})

// Temas: bloque de variables por tema en html[data-tema="..."]; sin atributo, hibrido.
const TEMAS = ['hibrido', 'mark-ii', 'mark-l', 'stark', 'claro', 'natural']
const VARS_TEMA = ['--bg', '--panel', '--txt', '--sub', '--acc', '--acc2', '--warn', '--crit', '--ok', '--modelo-opus', '--modelo-haiku', '--modelo-fable', '--modelo-otro']
function bloqueTema(t: string): string {
  const sel = `html[data-tema="${t}"]{`
  const i = PAGE.indexOf(sel)
  return i < 0 ? '' : PAGE.slice(i + sel.length, PAGE.indexOf('\n}', i))
}

test('the page defines the six themes, each with every color variable', () => {
  for (const t of TEMAS) {
    const b = bloqueTema(t)
    expect(b.length > 0).toBe(true)
    for (const v of VARS_TEMA) expect(b).toContain(`${v}:#`)
  }
})

test('the default theme (no data-tema attribute) is hibrido', () => {
  // El bloque de :root es el mismo que el de hibrido; los demás temas solo se aplican con su atributo.
  expect(PAGE).toContain(':root,html[data-tema="hibrido"]{')
  for (const t of TEMAS.filter(x => x !== 'hibrido')) {
    expect(PAGE).not.toContain(`:root,html[data-tema="${t}"]`)
    expect(PAGE).toContain(`\nhtml[data-tema="${t}"]{`)
  }
  expect(PAGE.indexOf(':root,html[data-tema="hibrido"]{') < PAGE.indexOf('html[data-tema="mark-ii"]{')).toBe(true)
  // El HTML no fija ningún tema: lo pone quien abre la página.
  expect(PAGE).toContain('<html lang="es">')
})

test('themes keep red for alerts only and drop effects in compact mode', () => {
  for (const t of TEMAS) {
    const b = bloqueTema(t)
    const crit = /--crit:(#[0-9a-f]{6})/.exec(b)?.[1] ?? ''
    expect(crit.length).toBe(7)
    // El rojo del tema no se usa como acento ni como color de familia.
    for (const v of ['--acc', '--acc2', '--ok', '--warn', '--modelo-opus', '--modelo-haiku', '--modelo-fable', '--modelo-otro']) {
      expect(b).not.toContain(`${v}:${crit}`)
    }
  }
  expect(PAGE).toContain('body.compact{--glow:0;--cristal:none}')
  expect(PAGE).toContain('@supports not ((-webkit-backdrop-filter:blur(1px)) or (backdrop-filter:blur(1px)))')
  expect(PAGE).toContain('@media (prefers-reduced-motion:reduce)')
})

test('session.start writes the page and the data and opens the window, without a side pane', PRUEBA, async ($, on) => {
  mock.clock(on, { now: 1_000 })
  const writes: { path: string; text: string }[] = []
  const runs: (readonly string[])[] = []
  const opens: unknown[] = []
  on('fs.write', (_, e) => {
    writes.push(e)
    return { value: undefined }
  })
  on('process.run', (_, e) => {
    runs.push(e.argv)
    return ok
  })
  on('ui.open', (_, e) => {
    opens.push(e)
    return { value: { isPlaced: true } }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.model', () => ({ value: 'claude-haiku-5-5' }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { tokens: 1000, window: 200000, percent: 1 }, rateLimits: [], cost: { usd: 0.25 } },
  }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  expect(opens).toHaveLength(0)
  expect(writes.find(w => w.path === '/prueba/consumo/index.html')?.text).toBe(PAGE)
  const d = writes.find(w => w.path === '/prueba/consumo/datos.js')?.text ?? ''
  expect(d).toContain('window.CONSUMO = ')
  expect(d).toContain('claude-haiku-5-5')
  expect(runs.some(a => a.some(x => x.includes('--app=file:///prueba/consumo/index.html')))).toBe(true)
})

test('datos.js splits the work by model and carries the history, the alert and a heartbeat', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000 })
  const writes: { path: string; text: string }[] = []
  on('fs.write', (_, e) => {
    writes.push(e)
    return { value: undefined }
  })
  on('process.run', () => ok)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.model', () => ({ value: 'claude-fable-5' }))
  let usd = 0.5
  on('session.usage', () => ({
    value: { startedAt: 0, context: { tokens: 176000, window: 200000, percent: 88 }, rateLimits: [], cost: { usd } },
  }))
  on('turn.complete', () => ({ text: '' }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const usage = (model: string, input: number, output: number) => ({
    model,
    input_tokens: input,
    output_tokens: output,
    cache_read_input_tokens: 10,
    cache_creation_input_tokens: 0,
  })
  const turn = { answer: '', durationMs: 1, isAborted: false, reason: 'answer' } as const
  await $.turn.complete({ ...turn, turnId: 't1', usage: usage('claude-fable-5', 100, 100) })
  usd = 0.75
  await $.turn.complete({ ...turn, turnId: 't2', agentId: 'a1', usage: usage('claude-opus-5-5', 500, 100) })
  await $.turn.complete({ ...turn, turnId: 't3', agentId: 'a2', usage: usage('claude-haiku-5-5', 150, 50) })
  await $.turn.complete({ ...turn, turnId: 't4', agentId: 'a2', usage: usage('claude-haiku-5-5', 0, 0) })

  const last = () => {
    const w = writes.filter(x => x.path.endsWith('datos.js')).at(-1)
    return JSON.parse((w?.text ?? '').replace(/^window\.CONSUMO = /, '').replace(/;$/, ''))
  }
  const d = last()
  expect(d.alerta).toBe('critica')
  expect(d.historial).toHaveLength(4)
  expect(d.historial[1].familia).toBe('opus')
  expect(d.historial[1].coste).toBe(0.25)
  const by = (f: string) => d.modelos.find((m: { familia: string }) => m.familia === f)
  expect(by('opus').reparto).toBe(60)
  expect(by('haiku').turnos).toBe(2)
  expect(by('haiku').repartoTurnos).toBe(50)
  expect(by('fable').principal).toBe(true)
  expect(d.agentes.find((a: { nombre: string }) => a.nombre === 'Principal').modelo).toBe('claude-fable-5')

  const before = d.latido
  await clock.advance(3_000)
  expect(last().latido).toBeGreaterThan(before)
  expect(last().actualizado).toBe(d.actualizado)
})

// ---------- Sincronía de datos ----------

type On = Parameters<TestBody>[1]
const L = { nuevoEstado, valido, alCargar, alFallar, senal }
const logica = () => L
const T0 = 1_800_000_000_000
const datos = (latido: number) => ({ contexto: { tokens: 1, window: 2, percent: 50 }, coste: 0.1, latido, actualizado: latido })

const base = (on: On, usd: () => number | undefined) => {
  const writes: { path: string; text: string }[] = []
  on('fs.write', (_, e) => {
    writes.push(e)
    return { value: undefined }
  })
  on('process.run', () => ok)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.model', () => ({ value: 'claude-fable-5' }))
  on('session.usage', () => {
    const c = usd()
    return { value: { startedAt: 0, context: { tokens: 10, window: 100, percent: 10 }, rateLimits: [], ...(c === undefined ? {} : { cost: { usd: c } }) } }
  })
  on('turn.complete', () => ({ text: '' }))
  const last = () => {
    const w = writes.filter(x => x.path.endsWith('datos.js')).at(-1)
    return JSON.parse((w?.text ?? '').replace(/^window\.CONSUMO = /, '').replace(/;$/, ''))
  }
  return { writes, last }
}
const turnOf = (turnId: string, agentId: string | undefined, model: string, input: number) => ({
  answer: '', durationMs: 1, isAborted: false, reason: 'answer', turnId, ...(agentId ? { agentId } : {}),
  usage: { model, input_tokens: input, output_tokens: 10, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
}) as const

test('(a) a half-written datos.js is ignored, the last good data stays and the page keeps going', () => {
  const L = logica()
  const st = L.nuevoEstado(T0)
  expect(L.alCargar(st, datos(T0), T0)).toBe(true)
  // Truncado: el script no llega a definir CONSUMO, o lo define sin campos.
  for (const roto of [undefined, null, {}, { contexto: { tokens: 1 } }, 'window.CONSUMO = {"mod']) {
    expect(L.alCargar(st, roto, T0 + 1000)).toBe(false)
  }
  expect(st.fails).toBe(5)
  expect(st.loadOk).toBe(true)
  expect(L.senal(st, T0 + 2000).alerta).toBe(false)
  expect(L.alCargar(st, datos(T0 + 3000), T0 + 3000)).toBe(true)
  expect(st.fails).toBe(0)
  // La página borra CONSUMO antes de cada lectura y silencia el error de sintaxis de datos.js.
  expect(L.valido(datos(T0))).toBe(true)
  expect(PAGE).toContain(LOGICA)
  expect(PAGE).toContain('window.CONSUMO=undefined')
  expect(PAGE).toContain("window.onerror=function(msg,src){if(src&&(String(src).indexOf('datos.js')>=0||String(src).indexOf('estado.js')>=0))return true}")
})

test('(b) a 3 s heartbeat read every 1 s never shows a false SIN SEÑAL, and a real stop does', () => {
  const L = logica()
  const st = L.nuevoEstado(T0)
  let beat = T0
  for (let t = 0; t <= 60_000; t += 1000) {
    if (t % 3000 === 0) beat = T0 + t
    // Una lectura de cada siete falla (archivo a medio escribir o bloqueado).
    if (t % 7000 === 3000) L.alFallar(st)
    else L.alCargar(st, datos(beat), T0 + t)
    expect(L.senal(st, T0 + t).alerta).toBe(false)
  }
  // El plugin deja de latir: se avisa al pasar 10 s, no antes.
  for (let t = 61_000; t <= 75_000; t += 1000) {
    L.alCargar(st, datos(beat), T0 + t)
    expect(L.senal(st, T0 + t).alerta).toBe(T0 + t - (T0 + 60_000) > 10_000)
  }
  expect(L.senal(st, T0 + 75_000).aviso).toBe('Sin señal hace 15 s')
  // Un datos.js que ya era viejo al abrir la página no cuenta como señal.
  const viejo = L.nuevoEstado(T0)
  L.alCargar(viejo, datos(T0 - 60_000), T0)
  expect(L.senal(viejo, T0 + 11_000).alerta).toBe(true)
})

test('(c) parallel subagents and a repeated turn.complete do not duplicate turns', async ($, on) => {
  mock.clock(on, { now: 1_000 })
  let usd = 1
  const { last } = base(on, () => usd)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  usd = 1.4
  await Promise.all([
    $.turn.complete(turnOf('t1', 'a1', 'claude-haiku-5-5', 100)),
    $.turn.complete(turnOf('t2', 'a2', 'claude-haiku-5-5', 200)),
    $.turn.complete(turnOf('t3', 'a3', 'claude-opus-5-5', 300)),
  ])
  await $.turn.complete(turnOf('t2', 'a2', 'claude-haiku-5-5', 200))
  const d = last()
  expect(d.historial).toHaveLength(3)
  expect(new Set(d.historial.map((h: { agente: string }) => h.agente)).size).toBe(3)
  expect(d.agentes.reduce((a: number, x: { turns: number }) => a + x.turns, 0)).toBe(3)
  expect(d.modelos.reduce((a: number, x: { turnos: number }) => a + x.turnos, 0)).toBe(3)
  // El coste de los tres turnos suma lo que subió el contador, sin contarlo dos veces.
  const sum = d.historial.reduce((a: number, h: { coste: number | null }) => a + (h.coste ?? 0), 0)
  expect(Math.round(sum * 1e6) / 1e6).toBe(0.4)
  expect(d.coste).toBe(1.4)
})

test('(d) the cost per turn is never negative nor counted twice after /clear or a resume', async ($, on) => {
  // Lógica pura.
  let l = observe({ last: null, base: 0, ids: [], turn: null }, undefined, 'x0')
  expect(l.turn?.cost).toBeNull()
  l = observe(l, 2, 'x1')
  expect(l.turn?.cost).toBeNull() // sin lectura previa no se imputa todo lo acumulado
  l = observe(l, 2.5, 'x2')
  expect(l.turn?.cost).toBe(0.5)
  l = observe(l, 0.2, 'x3') // el contador volvió a empezar
  expect(l.turn?.cost).toBe(0.2)
  expect(l.base + (l.last ?? 0)).toBe(2.7)
  expect(observe(l, 9, 'x3').turn).toEqual({ id: 'x3', dup: true, cost: null })

  // Con los hooks: arranque, un turno, /clear (contador a cero), reanudar (session.start otra vez).
  mock.clock(on, { now: 1_000 })
  let usd = 0.5
  const { last } = base(on, () => usd)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  usd = 0.75
  await $.turn.complete(turnOf('t1', undefined, 'claude-fable-5', 10))
  usd = 0.1
  await $.turn.complete(turnOf('t2', undefined, 'claude-fable-5', 10))
  usd = 0
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  usd = 0.05
  await $.turn.complete(turnOf('t3', undefined, 'claude-fable-5', 10))
  const d = last()
  expect(d.historial.map((h: { coste: number }) => h.coste)).toEqual([0.25, 0.1, 0.05])
  expect(d.historial.every((h: { coste: number }) => h.coste >= 0)).toBe(true)
  expect(d.coste).toBe(0.9)
})

test('(e) with datos.js missing the window still opens and the page shows an empty HUD that warns', async ($, on) => {
  mock.clock(on, { now: 1_000 })
  const runs: (readonly string[])[] = []
  on('fs.write', (_, e) => {
    if (e.path.endsWith('datos.js')) throw new Error('EBUSY')
    return { value: undefined }
  })
  on('process.run', (_, e) => {
    runs.push(e.argv)
    return ok
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.model', () => ({ value: 'claude-fable-5' }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens: 0, window: 100, percent: 0 }, rateLimits: [] } }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(runs.length).toBeGreaterThan(0)

  // La página se pinta vacía desde el principio y no avisa hasta pasados 10 s.
  expect(PAGE).toContain('render(VACIO)')
  const L = logica()
  const st = L.nuevoEstado(T0)
  for (let t = 1000; t <= 12_000; t += 1000) {
    L.alFallar(st)
    const s = L.senal(st, T0 + t)
    expect(s.alerta).toBe(t > 10_000)
    if (t <= 10_000) expect(s.texto).toBe('Esperando')
  }
  expect(L.senal(st, T0 + 12_000).aviso).toBe('datos.js no responde')
})

// ---------- Plan de Claude (TaskCreate / TaskUpdate) ----------

// Lo que la herramienta contesta, bajo el plugin: TaskCreate da un id nuevo, TaskUpdate dice que fue bien.
const planBase = (on: On) => {
  let seq = 0
  on('tool.call', (_, e) => {
    if (e.tool === 'TaskCreate') return { result: { task: { id: String(++seq), subject: e.subject } } }
    if (e.tool === 'TaskUpdate') return { result: { success: true, taskId: e.taskId, updatedFields: e.status ? ['status'] : [] } }
    return { result: {} }
  })
}
const crea = (subject: string) => ({ tool: 'TaskCreate', subject, description: subject }) as const
const marca = (taskId: string, status: 'pending' | 'in_progress' | 'completed' | 'deleted') => ({ tool: 'TaskUpdate', taskId, status }) as const

test('(f) plan: with no tasks the plan block is null and the page shows "sin tareas activas"', async ($, on) => {
  mock.clock(on, { now: 1_000 })
  const { last } = base(on, () => 0)
  planBase(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(last().plan).toBeNull()
  // Una herramienta que no es del plan no lo crea.
  await $.tool.call({ tool: 'TaskList' })
  expect(last().plan).toBeNull()
  expect(resumen(PLAN0)).toBeNull()
  // Una tarea creada y luego borrada deja el plan vacío otra vez.
  expect(resumen(actualizar(crear(PLAN0, '1', 'a'), '1', { status: 'deleted' }))).toBeNull()
  expect(PAGE).toContain('PLAN · sin tareas activas')
  expect(PAGE).toContain('COMPLETADO')
  expect(PAGE).toContain('plan:null')
})

test('(g) plan: 3 of 7 completed is 43 %, with one in progress and the titles in order', async ($, on) => {
  mock.clock(on, { now: 1_000 })
  const { last } = base(on, () => 0)
  planBase(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  for (let i = 1; i <= 7; i++) await $.tool.call(crea('Tarea ' + i))
  for (const id of ['1', '2', '3']) await $.tool.call(marca(id, 'completed'))
  await $.tool.call(marca('4', 'in_progress'))
  const p = last().plan
  expect(p.total).toBe(7)
  expect(p.completadas).toBe(3)
  expect(p.enCurso).toBe(1)
  expect(p.porcentaje).toBe(43)
  expect(p.tareas.map((t: { titulo: string }) => t.titulo)).toEqual(['Tarea 1', 'Tarea 2', 'Tarea 3', 'Tarea 4', 'Tarea 5', 'Tarea 6', 'Tarea 7'])
  expect(p.tareas.map((t: { estado: string }) => t.estado)).toEqual(['completada', 'completada', 'completada', 'en curso', 'pendiente', 'pendiente', 'pendiente'])
})

test('(h) plan: all tasks completed is 100 %, and a task completed twice counts once', async ($, on) => {
  mock.clock(on, { now: 1_000 })
  const { last } = base(on, () => 0)
  planBase(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  for (let i = 1; i <= 3; i++) await $.tool.call(crea('T' + i))
  await $.tool.call(marca('1', 'completed'))
  await $.tool.call(marca('1', 'completed'))
  let p = last().plan
  expect(p.completadas).toBe(1)
  expect(p.porcentaje).toBe(33)
  await $.tool.call(marca('2', 'completed'))
  await $.tool.call(marca('3', 'completed'))
  await $.tool.call(marca('3', 'completed'))
  p = last().plan
  expect(p.total).toBe(3)
  expect(p.completadas).toBe(3)
  expect(p.porcentaje).toBe(100)

  // Lógica pura: una creación repetida con el mismo id tampoco suma otra tarea.
  let v = crear(PLAN0, 'a', 'A')
  v = crear(v, 'a', 'A')
  v = actualizar(v, 'a', { status: 'completed' })
  v = actualizar(v, 'a', { status: 'completed' })
  expect(resumen(v)).toEqual({ total: 1, completadas: 1, enCurso: 0, porcentaje: 100, tareas: [{ titulo: 'A', estado: 'completada' }] })
  expect(idCreada({ task: { id: '9', subject: 'x' } })).toEqual({ id: '9', subject: 'x' })
  expect(idCreada(undefined)).toBeNull()
})

// ---------- Comparativa Haiku frente a Opus ----------

const tk = (input: number, output: number, cacheRead = 0, cacheWrite = 0) => ({ input, output, cacheRead, cacheWrite })
const turnU = (turnId: string, agentId: string | undefined, model: string, u: ReturnType<typeof tk>) => ({
  answer: '', durationMs: 1, isAborted: false, reason: 'answer', turnId, ...(agentId ? { agentId } : {}),
  usage: { model, input_tokens: u.input, output_tokens: u.output, cache_read_input_tokens: u.cacheRead, cache_creation_input_tokens: u.cacheWrite },
}) as const

test('(i) comparativa: with no Opus data there is no estimate and the page says "sin datos de Opus todavía"', async ($, on) => {
  mock.clock(on, { now: 1_000 })
  let usd = 0
  const { last } = base(on, () => usd)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  // Recién arrancada: sin turnos.
  let c = last().comparativa
  expect(c.disponible).toBe(false)
  expect(c.motivo).toBe('sin datos de Opus todavía')
  expect(c.costeOpusEstimado).toBeNull()
  // Solo Haiku y el modelo principal: sigue sin estimación, aunque haya coste real.
  usd = 0.01
  await $.turn.complete(turnU('t1', 'a1', 'claude-haiku-5-5', tk(2000, 500)))
  usd = 0.05
  await $.turn.complete(turnU('t2', undefined, 'claude-fable-5', tk(3000, 400)))
  c = last().comparativa
  expect(c.disponible).toBe(false)
  expect(c.motivo).toBe('sin datos de Opus todavía')
  expect(c.costeOpusEstimado).toBeNull()
  expect(c.ahorro).toBeNull()
  expect(c.ahorroPct).toBeNull()
  expect(c.costeReal).toBe(0.05)
  expect(c.tokensPorModelo).toEqual([{ familia: 'fable', tokens: 3400, coste: 0.04 }, { familia: 'haiku', tokens: 2500, coste: 0.01 }])
  // Sin Haiku tampoco hay estimación.
  const soloOpus = calcular(sumar(COMP0, 'claude-opus-5-5', tk(4000, 1000), 0.1))
  expect(soloOpus.disponible).toBe(false)
  expect(soloOpus.motivo).toBe('sin datos de Haiku todavía')
  // La página tiene el panel, el texto de espera y la nota.
  expect(PAGE).toContain('id="p-comp"')
  expect(PAGE).toContain('Comparativa · Haiku frente a Opus')
  expect(PAGE).toContain('sin datos de Opus todavía')
  expect(PAGE).toContain('Estimación según tus turnos reales; el caché y la mezcla de entrada y salida afectan.')
  expect(PAGE).toContain('comparativa:null')
})

test('(j) comparativa: with both models the estimate reprices the Haiku work at the Opus cost per token', async ($, on) => {
  // Lógica pura con números redondos:
  // Haiku 2 500 tokens por 0.01 USD (0.000004 / token); Opus 2 000 tokens por 0.05 USD (0.000025 / token): 6.25 veces.
  // Real = 0.01 + 0.05 + 0.04 (principal) = 0.10. Todo en Opus = 0.10 - 0.01 + 0.01 × 6.25 = 0.1525.
  let k = sumar(COMP0, 'claude-haiku-5-5', tk(1500, 500, 400, 100), 0.01)
  k = sumar(k, 'claude-opus-5-5', tk(1500, 500), 0.05)
  k = sumar(k, 'claude-fable-5', tk(3000, 400), 0.04)
  const c = calcular(k)
  expect(c.disponible).toBe(true)
  expect(c.motivo).toBeUndefined()
  expect(c.costeReal).toBe(0.1)
  expect(c.costeOpusEstimado).toBe(0.1525)
  expect(c.ahorro).toBe(0.0525)
  expect(c.ahorroPct).toBe(34.4)
  expect(c.tokensPorModelo.map(x => x.familia)).toEqual(['fable', 'haiku', 'opus'])
  // Caché de lectura y escritura cuentan por separado y suman en los tokens de Haiku.
  expect(k['claude-haiku-5-5']).toEqual({ turns: 1, input: 1500, output: 500, cacheRead: 400, cacheWrite: 100, costTurns: 1, costTokens: 2500, cost: 0.01 })

  // Con los hooks: lo mismo a partir del contador de coste de la sesión.
  mock.clock(on, { now: 1_000 })
  let usd = 0
  const { last } = base(on, () => usd)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  usd = 0.01
  await $.turn.complete(turnU('t1', 'a1', 'claude-haiku-5-5', tk(1500, 500, 400, 100)))
  usd = 0.06
  await $.turn.complete(turnU('t2', 'a2', 'claude-opus-5-5', tk(1500, 500)))
  usd = 0.1
  await $.turn.complete(turnU('t3', undefined, 'claude-fable-5', tk(3000, 400)))
  const d = last().comparativa
  expect(d).toEqual(c)
  // Un turno de Haiku sin coste conocido no entra en el coste por token ni cambia la estimación.
  const sinCoste = calcular(sumar(k, 'claude-haiku-5-5', tk(9000, 0), null))
  expect(sinCoste.costeOpusEstimado).toBe(0.1525)
  expect(sinCoste.tokensPorModelo.find(x => x.familia === 'haiku')?.tokens).toBe(11500)
})

test('(k) comparativa: Opus with 1000 tokens or fewer is not used for the estimate, and the reason says so', () => {
  let k = sumar(COMP0, 'claude-haiku-5-5', tk(4000, 1000), 0.02)
  k = sumar(k, 'claude-opus-5-5', tk(600, 200), 0.03)
  let c = calcular(k)
  expect(c.disponible).toBe(false)
  expect(c.costeOpusEstimado).toBeNull()
  expect(c.ahorro).toBeNull()
  expect(c.motivo).toContain('sin datos de Opus todavía')
  expect(c.motivo).toContain('800 tokens')
  expect(c.motivo).toContain('no se usa para la estimación')
  expect(c.costeReal).toBe(0.05)
  // Justo 1000 tampoco basta: hacen falta más de 1000.
  c = calcular(sumar(k, 'claude-opus-5-5', tk(150, 50), 0.01))
  expect(c.disponible).toBe(false)
  // Con 1001 ya se usa.
  c = calcular(sumar(sumar(k, 'claude-opus-5-5', tk(150, 50), 0.01), 'claude-opus-5-5', tk(1, 0), 0))
  expect(c.disponible).toBe(true)
  // Lo mismo para Haiku.
  const h = calcular(sumar(sumar(COMP0, 'claude-opus-5-5', tk(4000, 1000), 0.1), 'claude-haiku-5-5', tk(300, 100), 0.001))
  expect(h.disponible).toBe(false)
  expect(h.motivo).toContain('Haiku solo lleva 400 tokens')
})

test('(l) comparativa: the real cost is the sum of the turns, and a repeated or parallel turn is not counted twice', async ($, on) => {
  mock.clock(on, { now: 1_000 })
  let usd = 0
  const { last } = base(on, () => usd)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  usd = 0.02
  await $.turn.complete(turnU('t1', 'a1', 'claude-haiku-5-5', tk(1200, 300)))
  usd = 0.12
  await Promise.all([
    $.turn.complete(turnU('t2', 'a2', 'claude-opus-5-5', tk(1800, 200))),
    $.turn.complete(turnU('t2', 'a2', 'claude-opus-5-5', tk(1800, 200))),
  ])
  await $.turn.complete(turnU('t1', 'a1', 'claude-haiku-5-5', tk(1200, 300)))
  usd = 0.15
  await $.turn.complete(turnU('t3', 'a1', 'claude-haiku-5-5', tk(500, 100)))
  const d = last()
  const sum = d.historial.reduce((a: number, h: { coste: number | null }) => a + (h.coste ?? 0), 0)
  expect(d.historial).toHaveLength(3)
  expect(d.comparativa.costeReal).toBe(Math.round(sum * 1e6) / 1e6)
  expect(d.comparativa.costeReal).toBe(0.15)
  expect(d.comparativa.costeReal).toBe(d.coste)
  const by = (f: string) => d.comparativa.tokensPorModelo.find((x: { familia: string }) => x.familia === f)
  expect(by('haiku')).toEqual({ familia: 'haiku', tokens: 2100, coste: 0.05 })
  expect(by('opus')).toEqual({ familia: 'opus', tokens: 2000, coste: 0.1 })
  // Haiku 0.05 / 2100 tokens, Opus 0.1 / 2000 tokens: Haiku en Opus = 2100 × 0.00005 = 0.105.
  expect(d.comparativa.disponible).toBe(true)
  expect(d.comparativa.costeOpusEstimado).toBe(0.205)
  expect(d.comparativa.ahorro).toBe(0.055)
})

const JARVIS = {
  command: 'jarvis',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 100 },
} as const

const hudBase: TestBody = ($, on) => {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.model', () => ({ value: 'claude-haiku-5-5' }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens: 0, window: 100, percent: 0 }, rateLimits: [] } }))
}

test('/jarvis toggles the HUD (close, open, close) and /consumo is gone', PRUEBA, async ($, on) => {
  mock.clock(on, { now: 1_000 })
  hudBase($, on)
  const writes: { path: string; text: string }[] = []
  const runs: (readonly string[])[] = []
  const names: string[] = []
  on('command.register', (_, e) => {
    names.push(e.name)
    return { value: { command: e.name } }
  })
  on('fs.write', (_, e) => {
    writes.push(e)
    return { value: undefined }
  })
  on('process.run', (_, e) => {
    runs.push(e.argv)
    return ok
  })
  const last = (end: string) => writes.filter(w => w.path.endsWith(end)).at(-1)?.text ?? ''

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  expect(names).toContain('jarvis')
  expect(names).not.toContain('consumo')
  expect(JSON.parse(last('/prueba/consumo/estado.json'))).toEqual({ abierto: true })
  const opened = runs.length
  expect(opened).toBeGreaterThan(0)

  const r1 = await $.command.run(JARVIS)
  expect(r1.text).toContain('HUD cerrado')
  expect(JSON.parse(last('/prueba/consumo/estado.json'))).toEqual({ abierto: false })
  expect(last('/prueba/consumo/estado.js')).toBe('window.CONSUMO_ESTADO = {"abierto":false};')
  // Cerrar no lanza ningún proceso: no se mata ninguna ventana.
  expect(runs.length).toBe(opened)

  const r2 = await $.command.run(JARVIS)
  expect(r2.text).toContain('HUD abierto')
  expect(JSON.parse(last('/prueba/consumo/estado.json'))).toEqual({ abierto: true })
  expect(runs.length).toBeGreaterThan(opened)
  expect(runs.at(-1)?.some(x => x.includes('--app=file:///prueba/consumo/index.html'))).toBe(true)

  const r3 = await $.command.run(JARVIS)
  expect(r3.text).toContain('HUD cerrado')
  expect(JSON.parse(last('/prueba/consumo/estado.json'))).toEqual({ abierto: false })
})

test('/jarvis answers clearly when no browser can be opened', async ($, on) => {
  mock.clock(on, { now: 1_000 })
  hudBase($, on)
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('fs.write', () => ({ value: undefined }))
  on('process.run', () => {
    throw new Error('spawn cmd ENOENT')
  })

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  // Al iniciar no se abrió, así que /jarvis intenta abrir y explica el fallo.
  const { text } = await $.command.run(JARVIS)
  expect(text).toContain('No se pudo abrir el HUD')
  expect(text).toContain('index.html')
})

test('the page reads estado.js, calls window.close() and shows the closed notice', () => {
  expect(PAGE).toContain("s.src='estado.js?'+now")
  expect(PAGE).toContain('window.close()')
  expect(PAGE).toContain('HUD cerrado. Escribe /jarvis para abrirlo.')
  expect(PAGE).toContain('loadEstado()')
})

test('dataDir: by default the data goes to ~/CLAUDE/consumo in the user folder (HOME or USERPROFILE)', async ($, on) => {
  mock.clock(on, { now: 1_000 })
  const writes: string[] = []
  const runs: (readonly string[])[] = []
  on('env.get', (_, e) => ({ value: e.name === 'HOME' ? '/usuarios/prueba' : undefined }))
  on('fs.write', (_, e) => {
    writes.push(e.path)
    return { value: undefined }
  })
  on('process.run', (_, e) => {
    runs.push(e.argv)
    return ok
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.model', () => ({ value: 'claude-haiku-5-5' }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens: 0, window: 200000, percent: 0 }, rateLimits: [] } }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  expect(DATA_DIR_DEFAULT).toBe('~/CLAUDE/consumo')
  expect(writes).toContain('/usuarios/prueba/CLAUDE/consumo/index.html')
  expect(writes).toContain('/usuarios/prueba/CLAUDE/consumo/datos.js')
  expect(writes).toContain('/usuarios/prueba/CLAUDE/consumo/estado.json')
  expect(runs.some(a => a.some(x => x.includes('--app=file:///usuarios/prueba/CLAUDE/consumo/index.html')))).toBe(true)
})

test('dataDir: "~" uses the Windows user folder with backslashes, and the page URL is a valid file URL', () => {
  // Carpeta de usuario de ejemplo en otra unidad: solo prueba el formato de las rutas de Windows.
  const dir = expandir('~/CLAUDE/consumo', 'D:\\Usuarios\\Ana María')
  expect(dir).toBe('D:\\Usuarios\\Ana María\\CLAUDE\\consumo')
  expect(unir(dir ?? '', 'index.html')).toBe('D:\\Usuarios\\Ana María\\CLAUDE\\consumo\\index.html')
  expect(fileUrl('D:\\Usuarios\\Ana María\\CLAUDE\\consumo\\index.html')).toBe(
    'file:///D:/Usuarios/Ana%20Mar%C3%ADa/CLAUDE/consumo/index.html',
  )
  expect(fileUrl('/prueba/con #/index.html')).toBe('file:///prueba/con%20%23/index.html')
  // Ruta absoluta: se usa tal cual. Relativa: cuenta desde la carpeta del usuario.
  expect(expandir('/datos/hud', '/usuarios/prueba')).toBe('/datos/hud')
  expect(expandir('hud', '/usuarios/prueba')).toBe('/usuarios/prueba/hud')
  // Vacía, o "~" sin carpeta de usuario conocida: null (el mod usa entonces la carpeta del plugin).
  expect(expandir('  ', '/usuarios/prueba')).toBe(null)
  expect(expandir('~/CLAUDE/consumo', undefined)).toBe(null)
})

test('dataDir: with no user folder known the data goes to the datos folder inside the plugin', async ($, on) => {
  mock.clock(on, { now: 1_000 })
  const writes: string[] = []
  on('env.get', () => ({ value: undefined }))
  on('fs.write', (_, e) => {
    writes.push(e.path)
    return { value: undefined }
  })
  on('process.run', () => ok)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.model', () => ({ value: 'claude-haiku-5-5' }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens: 0, window: 200000, percent: 0 }, rateLimits: [] } }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  expect(writes.some(p => /consumo[\\/]datos[\\/]index\.html$/.test(p))).toBe(true)
  expect(writes.some(p => p.includes('CLAUDE'))).toBe(false)
})

// ---------- Personalización (userConfig) ----------

// Arranca la sesión con las opciones del test y devuelve el config de datos.js y las líneas del log.
const arrancar = async ($: Parameters<TestBody>[0], on: Parameters<TestBody>[1]) => {
  mock.clock(on, { now: 1_000 })
  const writes: { path: string; text: string }[] = []
  const logs: string[] = []
  on('fs.write', (_, e) => {
    writes.push(e)
    return { value: undefined }
  })
  on('ui.log', (_, e) => {
    logs.push(e.text)
    return { value: undefined }
  })
  on('process.run', () => ok)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.model', () => ({ value: 'claude-haiku-5-5' }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens: 0, window: 200000, percent: 0 }, rateLimits: [] } }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const d = writes.filter(w => w.path === '/prueba/consumo/datos.js').at(-1)?.text ?? ''
  expect(d.startsWith('window.CONSUMO = ')).toBe(true)
  const data = JSON.parse(d.slice('window.CONSUMO = '.length, -1)) as { config: unknown }
  return { config: data.config, logs: logs.filter(l => l.startsWith('consumo:')) }
}

test('config: with no options datos.js carries the defaults and nothing is logged', PRUEBA, async ($, on) => {
  const { config, logs } = await arrancar($, on)
  expect(config).toEqual({
    tema: 'hibrido',
    acento: '#7fe7ff',
    densidad: 'comodo',
    idioma: 'es',
    actualizacion: 1,
    paneles: ['contexto', 'coste', 'reparto', 'agentes', 'historial', 'grafica', 'comparativa', 'plan'],
  })
  expect(config).toEqual(CONFIG_DEFAULT)
  expect(logs).toHaveLength(0)
})

test(
  'config: valid values reach datos.js (hex in lower case, panels in the HUD order)',
  { options: { dataDir: '/prueba/consumo', tema: 'stark', acento: '#FF0080', densidad: 'compacto', idioma: 'en', actualizacion: 3, paneles: ['plan', 'coste'] } },
  async ($, on) => {
    const { config, logs } = await arrancar($, on)
    expect(config).toEqual({ tema: 'stark', acento: '#ff0080', densidad: 'compacto', idioma: 'en', actualizacion: 3, paneles: ['coste', 'plan'] })
    expect(logs).toHaveLength(0)
  },
)

test(
  'config: a non-hex accent and an out-of-range refresh fall back to the defaults and log a warning',
  { options: { dataDir: '/prueba/consumo', acento: 'rojo', actualizacion: 9, tema: 'mark-l' } },
  async ($, on) => {
    const { config, logs } = await arrancar($, on)
    expect(config).toEqual({ ...CONFIG_DEFAULT, tema: 'mark-l' })
    expect(logs.some(l => l.includes('acento') && l.includes('#7fe7ff'))).toBe(true)
    expect(logs.some(l => l.includes('actualizacion') && l.includes('1–5'))).toBe(true)
  },
)

test('config: leerConfig rejects bad values one by one and keeps the good ones', () => {
  const bad = leerConfig({ tema: 'iron', densidad: 'enorme', idioma: 'fr', acento: '#12', actualizacion: 0, paneles: ['foo'] })
  expect(bad.config).toEqual(CONFIG_DEFAULT)
  expect(bad.avisos).toHaveLength(7)
  for (const k of ['tema', 'densidad', 'idioma', 'acento', 'actualizacion', 'foo']) expect(bad.avisos.some(a => a.includes(k))).toBe(true)

  expect(leerConfig({ actualizacion: 5.5 }).config.actualizacion).toBe(1)
  expect(leerConfig({ actualizacion: 5 }).config.actualizacion).toBe(5)
  expect(leerConfig({ acento: '#abc' }).config.acento).toBe('#abc')
  expect(leerConfig({ acento: '7fe7ff' }).config.acento).toBe('#7fe7ff')
  const mix = leerConfig({ paneles: ['grafica', 'nada', 'contexto', 'grafica'] })
  expect(mix.config.paneles).toEqual(['contexto', 'grafica'])
  expect(mix.avisos).toHaveLength(1)
  expect(leerConfig({ paneles: 'plan, coste' }).config.paneles).toEqual(['coste', 'plan'])
  expect(leerConfig({}).config.paneles).toEqual([...PANELES])
  expect(leerConfig({}).avisos).toHaveLength(0)
})

// ---------- Tema natural y opción tema ----------

// Contraste WCAG entre dos colores #rrggbb.
const lum = (hex: string): number => {
  const v = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(x => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
  return 0.2126 * v[0]! + 0.7152 * v[1]! + 0.0722 * v[2]!
}
const contraste = (a: string, b: string): number => {
  const x = lum(a)
  const y = lum(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
const varDe = (bloque: string, v: string): string => new RegExp(`${v}:(#[0-9a-f]{6})[;\\n]`).exec(bloque)?.[1] ?? ''

test('natural: the block has every color variable plus its own borders, globe tint and fonts', () => {
  const b = bloqueTema('natural')
  expect(b.length > 0).toBe(true)
  for (const v of VARS_TEMA) expect(varDe(b, v).length).toBe(7)
  for (const v of ['--borde', '--borde-2']) expect(varDe(b, v).length).toBe(7)
  for (const v of ['--globo-rgb', '--globo-rgb-w', '--globo-rgb-x']) expect(new RegExp(`${v}:\\d+,\\d+,\\d+;`).test(b)).toBe(true)
  for (const v of ['--sans:', '--cifra:', '--gap:', '--pad:', '--glow:0;', '--cristal:none;']) expect(b).toContain(v)
})

test('natural: main text, labels and accent reach 4.5:1 on the background and on the panels', () => {
  const b = bloqueTema('natural')
  const fondos = [varDe(b, '--bg'), varDe(b, '--panel')]
  for (const f of fondos) {
    for (const v of ['--txt', '--sub', '--acc', '--warn', '--crit', '--crit-txt', '--modelo-opus', '--modelo-haiku', '--modelo-fable', '--modelo-otro']) {
      const r = contraste(varDe(b, v), f)
      if (r < 4.5) throw new Error(`${v} sobre ${f}: ${r.toFixed(2)}`)
    }
  }
  // El texto principal va muy por encima del mínimo.
  expect(contraste(varDe(b, '--txt'), varDe(b, '--panel')) >= 12).toBe(true)
})

test('natural: keeps the 3D globe, ring and core, and drops neon, grid, scan and forced capitals', () => {
  const N = 'html[data-tema="natural"]'
  // El 3D es común a todos los temas y natural no lo apaga.
  for (const k of ['<canvas id="globe"', 'class="gring"', 'transform-style:preserve-3d', 'rotateX(72deg)', 'id="pct"']) expect(PAGE).toContain(k)
  const reglas = PAGE.split('\n').filter(l => l.includes(N))
  for (const l of reglas) {
    for (const sel of ['.gring', '#globe', '.reactor', '.halo', '.rc']) {
      if (l.includes(`${N} ${sel}{`)) expect(l).not.toContain('display:none')
    }
  }
  expect(PAGE).toContain(`${N} .gring svg{filter:none;animation-duration:30s}`)
  expect(PAGE).toContain(`${N} .neb,${N} .floor,${N} .scan,${N} .shift{display:none}`)
  expect(PAGE).toContain(`${N} .k{text-transform:none`)
  expect(PAGE).toContain(`${N} .ph .t{font-size:var(--fv);font-weight:600;letter-spacing:0;text-transform:none;text-shadow:none}`)
  expect(PAGE).toContain(`${N} h1 .brand{display:none}`)
  // Ninguna regla de natural añade brillo de neón.
  for (const l of reglas) expect(/text-shadow:0 0 \d+px rgba\(var\(--acc/.test(l)).toBe(false)
  // Distribución propia en pantallas anchas: el contexto a un lado y los datos en una rejilla de tres columnas.
  expect(PAGE).toContain(`grid-template-areas:"ctx cost mod agt" "ctx comp chart chart" "ctx comp hist hist"`)
})

test('tema: aplicaTema puts config.tema in data-tema and ignores a missing or unknown theme', () => {
  const root = { dataset: {} as Record<string, string | undefined> }
  expect(aplicaTema(root, { config: { tema: 'natural' } })).toBe('natural')
  expect(root.dataset.tema).toBe('natural')
  expect(aplicaTema(root, { config: { tema: 'iron' } })).toBeNull()
  expect(aplicaTema(root, { config: {} })).toBeNull()
  expect(aplicaTema(root, { contexto: {}, coste: 1 })).toBeNull()
  expect(aplicaTema(root, null)).toBeNull()
  expect(root.dataset.tema).toBe('natural')
  expect(aplicaTema(root, { config: { tema: 'hibrido' } })).toBe('hibrido')
  expect(root.dataset.tema).toBe('hibrido')
  // Sin tema nunca se pone el atributo: la página queda en hibrido (:root).
  const vacio = { dataset: {} as Record<string, string | undefined> }
  aplicaTema(vacio, {})
  expect('tema' in vacio.dataset).toBe(false)
  // La página la lleva dentro, la llama al cargar (último tema guardado) y en cada lectura válida de datos.js.
  expect(LOGICA).toContain('var aplicaTema=(')
  expect(PAGE).toContain('var t=aplicaTema(document.documentElement,d);')
  expect(PAGE).toContain('if(alCargar(ST,d,Date.now())){try{ponTema(d,true)}catch(err){}try{render(d)}catch(err){}}')
  expect(PAGE).toContain("t=localStorage.getItem(TKEY)}catch(e){}if(t)try{ponTema({config:{tema:t}},false)}")
})

test(
  'tema: the tema option travels through datos.js to data-tema (natural)',
  { options: { dataDir: '/prueba/consumo', tema: 'natural' } },
  async ($, on) => {
    mock.clock(on, { now: 1_000 })
    const writes: { path: string; text: string }[] = []
    on('fs.write', (_, e) => {
      writes.push(e)
      return { value: undefined }
    })
    on('process.run', () => ok)
    on('session.start', (_, e) => ({ cwd: e.cwd }))
    on('session.model', () => ({ value: 'claude-haiku-5-5' }))
    on('session.usage', () => ({ value: { startedAt: 0, context: { tokens: 0, window: 200000, percent: 0 }, rateLimits: [] } }))
    await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
    const d = writes.filter(w => w.path === '/prueba/consumo/datos.js').at(-1)?.text ?? ''
    const data = JSON.parse(d.slice('window.CONSUMO = '.length, -1)) as unknown
    const st = nuevoEstado(1_000)
    // Lo mismo que hace la página: lectura válida y luego el tema.
    expect(alCargar(st, data, 1_000)).toBe(true)
    const root = { dataset: {} as Record<string, string | undefined> }
    expect(aplicaTema(root, data)).toBe('natural')
    expect(root.dataset.tema).toBe('natural')
    expect(leerConfig({ tema: 'natural' }).avisos).toHaveLength(0)
  },
)

test('tema: with no option datos.js carries hibrido, the default theme', PRUEBA, async ($, on) => {
  const { config } = await arrancar($, on)
  const root = { dataset: {} as Record<string, string | undefined> }
  expect(aplicaTema(root, { contexto: {}, coste: 0, config })).toBe('hibrido')
  expect(root.dataset.tema).toBe('hibrido')
})
