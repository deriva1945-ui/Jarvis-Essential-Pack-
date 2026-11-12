import { expect, mock, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

import { calcular, COMP0, sumar } from './comparativa'
import { DOM, firma, lista, ponAttr, ponEstilo, ponSegs, ponTexto } from './dom'
import { observe } from './ledger'
import { PAGE } from './page'
import { actualizar, crear, idCreada, PLAN0, resumen } from './plan'
import { DATA_DIR_DEFAULT, expandir, fileUrl, unir } from './rutas'
import { alCargar, alFallar, LOGICA, nuevoEstado, senal, valido } from './senal'

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

test('(m) señal: SIN SEÑAL needs 3 reads in a row without a new heartbeat, and a valid read clears it at once', () => {
  const L = logica()
  const st = L.nuevoEstado(T0)
  expect(L.alCargar(st, datos(T0), T0)).toBe(true)
  expect(L.senal(st, T0).estado).toBe('ok')
  // Ventana en segundo plano: el navegador deja de leer un minuto y la primera lectura falla.
  L.alFallar(st)
  let s = L.senal(st, T0 + 60_000)
  expect(s.alerta).toBe(false)
  expect(s.texto).toBe('Comprobando')
  L.alFallar(st)
  expect(L.senal(st, T0 + 61_000).alerta).toBe(false)
  // Tercera lectura fallida seguida: ahora sí.
  L.alFallar(st)
  s = L.senal(st, T0 + 62_000)
  expect(s.alerta).toBe(true)
  expect(s.estado).toBe('off')
  expect(s.aviso).toBe('datos.js no responde')
  // Vuelve un dato válido con latido nuevo: el aviso se va en esa misma lectura.
  expect(L.alCargar(st, datos(T0 + 63_000), T0 + 63_000)).toBe(true)
  s = L.senal(st, T0 + 63_000)
  expect(s.alerta).toBe(false)
  expect(s.estado).toBe('ok')
  expect(s.texto).toBe('En línea')
  expect(st.fails).toBe(0)
  expect(st.misses).toBe(0)
  // Fallos sueltos entre lecturas buenas nunca acumulan: cada latido nuevo pone la cuenta a cero.
  for (let t = 64_000; t <= 90_000; t += 1000) {
    if (t % 2000 === 0) L.alFallar(st)
    else L.alCargar(st, datos(T0 + t), T0 + t)
    expect(L.senal(st, T0 + t).alerta).toBe(false)
    expect(st.misses).toBeLessThan(2)
  }
  // Un dato válido pero con el mismo latido (el plugin se paró) no apaga el aviso.
  for (let t = 91_000; t <= 105_000; t += 1000) L.alCargar(st, datos(T0 + 89_000), T0 + t)
  expect(L.senal(st, T0 + 105_000).alerta).toBe(true)
  expect(L.senal(st, T0 + 105_000).aviso).toBe('Sin señal hace 16 s')
  // La página abandona una lectura colgada y no deja que su onload tardío cuente.
  expect(PAGE).toContain('if(actual!==s)return;')
})

test('(n) señal: the heartbeat starts again on the next tool call if the module was reloaded', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000 })
  const { writes } = base(on, () => 0)
  on('tool.call', () => ({ result: {} }))
  // Sin session.start (módulo recargado a mitad de sesión): la primera herramienta arranca el latido.
  await $.tool.call({ tool: 'TaskList' })
  const n0 = writes.filter(w => w.path.endsWith('datos.js')).length
  expect(n0).toBeGreaterThan(0)
  await clock.advance(9_000)
  expect(writes.filter(w => w.path.endsWith('datos.js')).length).toBeGreaterThanOrEqual(n0 + 3)
})

// ---------- Parpadeo: la página no reconstruye paneles ----------

// DOM falso mínimo: cuenta cada escritura (texto, atributo, estilo, alta y baja de hijos).
let escrituras = 0
class Falso {
  children: Falso[] = []
  attrs: Record<string, string> = {}
  estilo: Record<string, string> = {}
  private txt = ''
  style = {
    getPropertyValue: (p: string) => this.estilo[p] ?? '',
    setProperty: (p: string, v: string) => {
      escrituras++
      this.estilo[p] = v
    },
  }
  get textContent(): string {
    return this.txt
  }
  set textContent(v: string | null) {
    escrituras++
    this.txt = v ?? ''
  }
  getAttribute(k: string): string | null {
    return this.attrs[k] ?? null
  }
  setAttribute(k: string, v: string): void {
    escrituras++
    this.attrs[k] = v
  }
  insertBefore(n: Falso, ref: Falso | null): void {
    escrituras++
    const i = this.children.indexOf(n)
    if (i >= 0) this.children.splice(i, 1)
    const j = ref ? this.children.indexOf(ref) : -1
    if (j >= 0) this.children.splice(j, 0, n)
    else this.children.push(n)
  }
  removeChild(n: Falso): void {
    escrituras++
    this.children.splice(this.children.indexOf(n), 1)
  }
}
const segFalso = (count: number) => {
  const s = new Falso()
  for (let i = 0; i < count; i++) s.children.push(new Falso())
  return s
}
type Turno = { hora: number; agente: string; tokens: number }
const pintaTurnos = (box: Falso, hs: Turno[]) =>
  lista(
    box,
    hs,
    t => t.hora + '|' + t.agente,
    () => {
      const tr = new Falso()
      tr.children.push(new Falso(), new Falso())
      return tr
    },
    (tr, t) => {
      const k = (tr as Falso).children
      ponTexto(k[0] as Falso, t.agente)
      ponTexto(k[1] as Falso, t.tokens)
    },
  )

test('(o) parpadeo: a repeated read writes nothing and a new turn only adds its own row', () => {
  const box = new Falso()
  // Contenido inicial del HTML ("Sin turnos todavía", sin clave): se quita la primera vez.
  box.children.push(new Falso())
  let hs: Turno[] = [
    { hora: 1, agente: 'Principal', tokens: 100 },
    { hora: 2, agente: 'a1', tokens: 200 },
  ]
  let r = pintaTurnos(box, hs)
  expect(r).toEqual({ creados: 2, quitados: 1, movidos: 0 })
  const filas = [...box.children]

  // La misma lectura otra vez (lo que pasaba cada segundo): cero escrituras, mismos nodos.
  escrituras = 0
  r = pintaTurnos(box, hs.map(t => ({ ...t })))
  expect(r).toEqual({ creados: 0, quitados: 0, movidos: 0 })
  expect(escrituras).toBe(0)
  expect(box.children).toEqual(filas)
  expect(box.children[0]).toBe(filas[0])

  // Cambia un valor: solo se escribe ese nodo de texto.
  escrituras = 0
  hs = [hs[0] as Turno, { hora: 2, agente: 'a1', tokens: 250 }]
  pintaTurnos(box, hs)
  expect(escrituras).toBe(1)
  expect(box.children[1]?.children[1]?.textContent).toBe('250')

  // Turno nuevo arriba (la tabla va del más nuevo al más viejo): una fila nueva, las otras siguen siendo las mismas.
  escrituras = 0
  r = pintaTurnos(box, [{ hora: 3, agente: 'a2', tokens: 50 }, ...hs])
  expect(r).toEqual({ creados: 1, quitados: 0, movidos: 0 })
  expect(box.children[1]).toBe(filas[0])
  expect(box.children[2]).toBe(filas[1])
  expect(escrituras).toBe(3) // dos textos de la fila nueva y su alta

  // Claves repetidas (dos agentes con la misma etiqueta) no se pisan.
  const dup = new Falso()
  pintaTurnos(dup, [{ hora: 1, agente: 'x', tokens: 1 }, { hora: 1, agente: 'x', tokens: 2 }])
  expect(dup.children).toHaveLength(2)
})

test('(p) parpadeo: text, attributes, styles and segment bars are written only when they change', () => {
  const el = new Falso()
  escrituras = 0
  expect(ponTexto(el, '12 %')).toBe(true)
  expect(ponTexto(el, '12 %')).toBe(false)
  expect(ponAttr(el, 'class', 'al on')).toBe(true)
  expect(ponAttr(el, 'class', 'al on')).toBe(false)
  expect(ponEstilo(el, 'width', '42.0%')).toBe(true)
  // El navegador normaliza el valor ("42%"): se compara con el último puesto, no se vuelve a escribir.
  el.estilo['width'] = '42%'
  expect(ponEstilo(el, 'width', '42.0%')).toBe(false)
  expect(escrituras).toBe(3)

  const seg = segFalso(24)
  expect(ponSegs(seg, 50)).toBeGreaterThan(0)
  expect(seg.children.filter(i => i.attrs['class'] === 'on')).toHaveLength(12)
  expect(ponSegs(seg, 50)).toBe(0)
  // 51 % sigue siendo 12 de 24 segmentos: nada que tocar.
  expect(ponSegs(seg, 51)).toBe(0)
  // Fuera de rango se recorta y nunca hay segmentos negativos; un valor > 0 enciende al menos uno.
  ponSegs(seg, -20)
  expect(seg.children.filter(i => i.attrs['class'] === 'on')).toHaveLength(0)
  ponSegs(seg, 0.1)
  expect(seg.children.filter(i => i.attrs['class'] === 'on')).toHaveLength(1)
  ponSegs(seg, 400)
  expect(seg.children.filter(i => i.attrs['class'] === 'on')).toHaveLength(24)

  // La firma ignora el latido: una lectura que solo trae latido nuevo no repinta nada.
  expect(firma({ ...datos(T0), latido: T0 + 3000 })).toBe(firma({ ...datos(T0), latido: T0 + 6000 }))
  expect(firma({ ...datos(T0), coste: 0.2 })).not.toBe(firma(datos(T0)))
})

test('(q) parpadeo: the page uses the diff helpers and no panel is rebuilt with innerHTML', () => {
  expect(PAGE).toContain(DOM)
  expect(PAGE).toContain('if(f===FIRMA)return;')
  for (const viejo of [
    "$id('cmp').innerHTML",
    "$id('hrows').innerHTML",
    "$id('rows').innerHTML",
    "$id('link').innerHTML",
    "$id('plist').innerHTML",
    "$id('plcur').innerHTML",
    "$id('cah').innerHTML",
    "$id('ctk').innerHTML",
    'txt.innerHTML',
    'st.innerHTML',
    'el.innerHTML=fmt',
  ]) {
    expect(PAGE).not.toContain(viejo)
  }
  // Los únicos innerHTML: crear una pieza nueva (mk), las marcas del dial al cargar y la gráfica,
  // que solo se redibuja si entra un turno o cambia el tamaño.
  expect(PAGE.match(/innerHTML=/g)).toHaveLength(4)
  expect(PAGE).toContain('if(key===CHART)return;')
})

test('(r) métricas: one principal, shares add up, turns match everywhere, nothing negative, labels match the numbers', async ($, on) => {
  mock.clock(on, { now: 1_000 })
  let usd = 0.3
  let ctxUsage: { tokens: number; window: number; percent?: number } = { tokens: 50_000, window: 200_000 }
  const writes: { path: string; text: string }[] = []
  on('fs.write', (_, e) => {
    writes.push(e)
    return { value: undefined }
  })
  on('process.run', () => ok)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.model', () => ({ value: 'claude-fable-5' }))
  on('session.usage', () => ({ value: { startedAt: 0, context: ctxUsage, rateLimits: [], cost: { usd } } }))
  on('turn.complete', () => ({ text: '' }))
  const last = () => {
    const w = writes.filter(x => x.path.endsWith('datos.js')).at(-1)
    return JSON.parse((w?.text ?? '').replace(/^window\.CONSUMO = /, '').replace(/;$/, ''))
  }

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  // Sin lectura del contexto todavía: ventana 0, no 1.
  expect(last().contexto).toEqual({ tokens: 0, window: 0, percent: 0 })

  // El hilo principal contesta con Opus (cambio de modelo); el de la sesión (Fable) aún no tiene turnos.
  usd = 0.5
  await $.turn.complete(turnOf('t1', undefined, 'claude-opus-5-5', 300))
  let d = last()
  expect(d.modelos.filter((m: { principal: boolean }) => m.principal).map((m: { modelo: string }) => m.modelo)).toEqual(['claude-opus-5-5'])
  // Sin porcentaje del motor se calcula con tokens y ventana.
  expect(d.contexto).toEqual({ tokens: 50_000, window: 200_000, percent: 25 })

  usd = 0.6
  await $.turn.complete(turnOf('t2', 'a1', 'claude-haiku-5-5', 90))
  usd = 0.65
  await $.turn.complete(turnOf('t3', undefined, 'claude-fable-5', 100))
  usd = 0.65
  await $.turn.complete(turnOf('t3', undefined, 'claude-fable-5', 100)) // repetido
  ctxUsage = { tokens: 300_000, window: 200_000, percent: 150 }
  usd = 0.7
  await $.turn.complete(turnOf('t4', 'a1', 'claude-haiku-5-5', 0))
  d = last()

  // Un solo principal: ahora el modelo de la sesión, que ya tiene turnos.
  const principales = d.modelos.filter((m: { principal: boolean }) => m.principal)
  expect(principales.map((m: { modelo: string }) => m.modelo)).toEqual(['claude-fable-5'])
  // Turnos: cabecera (modelos), agentes e historial dicen lo mismo, sin contar el repetido.
  const turnosModelos = d.modelos.reduce((a: number, m: { turnos: number }) => a + m.turnos, 0)
  expect(turnosModelos).toBe(4)
  expect(d.agentes.reduce((a: number, x: { turns: number }) => a + x.turns, 0)).toBe(4)
  expect(d.historial).toHaveLength(4)
  // Reparto: porcentajes de trabajo y de turnos suman 100 (con redondeo a 0.1) y ninguno es negativo.
  const suma = (k: string) => Math.round(d.modelos.reduce((a: number, m: Record<string, number>) => a + (m[k] ?? 0), 0))
  expect(suma('reparto')).toBe(100)
  expect(suma('repartoTurnos')).toBe(100)
  // Trabajo = entrada + salida: 300 + 10, 90 + 10, 100 + 10, 0 + 10.
  const by = (f: string) => d.modelos.find((m: { familia: string }) => m.familia === f)
  expect(by('haiku').entrada + by('haiku').salida).toBe(110)
  expect(by('opus').reparto).toBe(Math.round((310 * 1000) / 530) / 10)
  // Coste por turno: lo que subió el contador, sin negativos, y la suma más lo de antes de arrancar es el total.
  const costes = d.historial.map((h: { coste: number }) => h.coste)
  expect(costes).toEqual([0.2, 0.1, 0.05, 0.05])
  expect(costes.every((c: number) => c >= 0)).toBe(true)
  expect(Math.round((0.3 + costes.reduce((a: number, c: number) => a + c, 0)) * 1e6) / 1e6).toBe(d.coste)
  // Todos los números del bloque son >= 0, y el contexto se recorta a 100 %.
  for (const m of d.modelos) for (const k of ['entrada', 'salida', 'cache', 'turnos', 'reparto', 'repartoTurnos']) expect(m[k]).toBeGreaterThanOrEqual(0)
  expect(d.contexto.percent).toBe(100)

  // Etiquetas de la página que cuadran con los números.
  expect(PAGE).toContain("hs.length+' de '+n(total)+' turnos'")
  expect(PAGE).toContain(' tokens con caché · ')
  expect(PAGE).toContain('Real en turnos')
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
