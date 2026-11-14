import { expect, mock, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

import { calcular, COMP0, sumar } from './comparativa'
import { CONFIG_DEFAULT, leerConfig, PANELES, TEMAS as TEMAS_CONFIG } from './config'
import { DOM, firma, lista, ponAttr, ponEstilo, ponSegs, ponTexto } from './dom'
import { EN, IDIOMA_JS, traducir } from './idioma'
import { observe } from './ledger'
import { convertirMoneda, formatoMoneda, MONEDA_JS } from './moneda'
import { densidadDe, PAGE } from './page'
import { actualizar, crear, idCreada, PLAN0, resumen } from './plan'
import { DATA_DIR_DEFAULT, expandir, fileUrl, unir } from './rutas'
import { alCargar, alFallar, LOGICA, nuevoEstado, senal, valido } from './senal'

// Carpeta de prueba para la opción dataDir: los tests no dependen de ninguna ruta real.
const PRUEBA = { options: { dataDir: '/prueba/consumo' } }

const ok = { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }

test('the page has the key sections and the size breakpoints', () => {
  for (const id of ['p-plan', 'plfill', 'pll', 'p-ctx', 'p-cost', 'p-mod', 'p-chart', 'p-hist', 'p-agt']) {
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

test('the layout adapts by container queries and documented breakpoints, with no text under 14 px', () => {
  const css = PAGE.slice(PAGE.indexOf('<style>'), PAGE.indexOf('</style>'))
  // Cada panel es un contenedor y se ajusta por dentro según su propio ancho.
  expect(css).toMatch(/\.pnl\{[^}]*container-type:inline-size/)
  for (const q of ['@container (max-width:599px)', '@container (max-width:459px)', '@container (max-width:419px)']) {
    expect(css).toContain(q)
  }
  // Una rejilla con áreas nombradas; .grid no dibuja caja para que el plan pueda ir entre los paneles.
  expect(css).toContain('.grid{display:contents}')
  expect(css).toContain('grid-template-areas:"head" "ctx" "cost" "comp" "mod" "agt" "plan" "hist" "chart" "foot"')
  // Breakpoints de ventana: los que se usan están documentados en el comentario del CSS.
  const doc = css.slice(css.indexOf('/* ===== Breakpoints ====='), css.indexOf('*/', css.indexOf('/* ===== Breakpoints =====')))
  expect(doc.length).toBeGreaterThan(100)
  for (const [media, nota] of [
    ['@media (min-width:560px)', '560 px'],
    ['@media (min-width:900px)', '900 px'],
    ['@media (min-width:1200px)', '1200 px'],
    ['@media (min-width:1600px) and (min-height:1000px)', '1600 px y 1000 px de alto'],
  ]) {
    expect(css).toContain(media)
    expect(doc).toContain(nota)
  }
  for (const nota of ['< 600 px', '< 460 px', '< 420 px', '14 px']) expect(doc).toContain(nota)
  // clamp() con vw, vh y cqi.
  expect(css).toMatch(/clamp\([^;]*vw/)
  expect(css).toMatch(/clamp\([^;]*vh/)
  expect(css).toMatch(/clamp\([^;]*cqi/)
  // Ningún font-size (ni font abreviado) por debajo de 14 px.
  const sizes = [...css.matchAll(/font(?:-size)?:\s*(?:[a-z0-9-]+\s+)?(?:clamp\()?(\d+(?:\.\d+)?)px/g)].map(m => Number(m[1]))
  expect(sizes.length).toBeGreaterThan(3)
  expect(sizes.filter(px => px < 14)).toEqual([])
  expect(css).not.toMatch(/font-size:\s*(?:[0-9]|1[0-3])(?:\.\d+)?px/)
})

// Temas: bloque de variables por tema en html[data-tema="..."]; el HTML sale con monocromo.
const TEMAS = ['natural', 'hibrido', 'mark-ii', 'mark-l', 'stark', 'claro', 'monocromo']
const VARS_TEMA = ['--bg', '--panel', '--txt', '--sub', '--acc', '--acc2', '--warn', '--crit', '--ok', '--modelo-opus', '--modelo-haiku', '--modelo-fable', '--modelo-otro']
function bloqueTema(t: string): string {
  const sel = `html[data-tema="${t}"]{`
  const i = PAGE.indexOf(sel)
  return i < 0 ? '' : PAGE.slice(i + sel.length, PAGE.indexOf('\n}', i))
}

test('the page defines the seven themes, each with every color variable', () => {
  for (const t of TEMAS) {
    const b = bloqueTema(t)
    expect(b.length > 0).toBe(true)
    for (const v of VARS_TEMA) expect(b).toContain(`${v}:#`)
  }
})

test('the default theme is natural', () => {
  // El HTML sale con data-tema="monocromo" y, sin atributo, :root:not([data-tema]) da las variables de monocromo.
  // Los demás temas solo se aplican con su atributo.
  expect(PAGE).toContain(':root:not([data-tema]),html[data-tema="monocromo"]{')
  for (const t of TEMAS.filter(x => x !== 'monocromo')) {
    expect(PAGE).not.toContain(`:root,html[data-tema="${t}"]`)
    expect(PAGE).not.toContain(`:root:not([data-tema]),html[data-tema="${t}"]`)
    expect(PAGE).toContain(`\nhtml[data-tema="${t}"]{`)
  }
  expect(PAGE).toContain('<html lang="es" data-tema="monocromo">')
})

test('themes keep red for alerts only and drop effects in compact density', () => {
  for (const t of TEMAS) {
    const b = bloqueTema(t)
    const crit = /--crit:(#[0-9a-f]{6})/.exec(b)?.[1] ?? ''
    expect(crit.length).toBe(7)
    // El rojo del tema no se usa como acento ni como color de familia.
    for (const v of ['--acc', '--acc2', '--ok', '--warn', '--modelo-opus', '--modelo-haiku', '--modelo-fable', '--modelo-otro']) {
      expect(b).not.toContain(`${v}:${crit}`)
    }
  }
  expect(PAGE).toContain('html[data-densidad="compacto"] body{--glow:0;--cristal:none}')
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
  // Las etiquetas pasan por tx() para la opción idioma (es / en).
  expect(PAGE).toContain("hs.length+tx(' de ')+n(total)+tx(' turnos')")
  expect(PAGE).toContain("tx(' tokens con caché')+' · '")
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
  expect(PAGE).toContain('Plan · sin tareas activas')
  expect(PAGE).toContain('Completado')
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
  expect(PAGE).toContain('Estimación con tus turnos reales; varía con la caché y con la proporción de entrada y salida.')
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
    tema: 'monocromo',
    acento: '#7fe7ff',
    idioma: 'es',
    actualizacion: 1,
    paneles: ['contexto', 'coste', 'reparto', 'agentes', 'historial', 'grafica', 'comparativa', 'plan'],
    moneda: 'EUR',
    tipoCambio: 0.92,
  })
  expect(config).toEqual(CONFIG_DEFAULT)
  expect(logs).toHaveLength(0)
})

test(
  'config: valid values reach datos.js (hex in lower case, panels in the HUD order)',
  { options: { dataDir: '/prueba/consumo', tema: 'stark', acento: '#FF0080', idioma: 'en', actualizacion: 3, paneles: ['plan', 'coste'] } },
  async ($, on) => {
    const { config, logs } = await arrancar($, on)
    expect(config).toEqual({ tema: 'stark', acento: '#ff0080', idioma: 'en', actualizacion: 3, paneles: ['coste', 'plan'], moneda: 'EUR', tipoCambio: 0.92 })
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

test(
  'config: an old settings.json with densidad still loads, without warnings, and densidad does not reach datos.js',
  { options: { dataDir: '/prueba/consumo', densidad: 'compacto', tema: 'natural', idioma: 'en' } },
  async ($, on) => {
    const { config, logs } = await arrancar($, on)
    expect(config).toEqual({ ...CONFIG_DEFAULT, tema: 'natural', idioma: 'en' })
    expect('densidad' in (config as object)).toBe(false)
    expect(logs).toHaveLength(0)
    // leerConfig tampoco se queja con un valor raro de la opción antigua.
    for (const v of ['compacto', 'comodo', 'enorme', 3, null, ['x']]) {
      const r = leerConfig({ densidad: v } as never)
      expect(r.config).toEqual(CONFIG_DEFAULT)
      expect(r.avisos).toHaveLength(0)
    }
    expect('densidad' in CONFIG_DEFAULT).toBe(false)
  },
)

test('config: leerConfig rejects bad values one by one and keeps the good ones', () => {
  const bad = leerConfig({ tema: 'iron', idioma: 'fr', acento: '#12', actualizacion: 0, paneles: ['foo'] })
  expect(bad.config).toEqual(CONFIG_DEFAULT)
  expect(bad.avisos).toHaveLength(6)
  for (const k of ['tema', 'idioma', 'acento', 'actualizacion', 'foo']) expect(bad.avisos.some(a => a.includes(k))).toBe(true)

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

test('config: the page applies config (data-tema on <html>, accent, language, refresh and panels)', () => {
  expect(PAGE).toContain('aplicaConfig(d.config);')
  expect(PAGE).toContain("ponAttr(root,'data-tema',TEMAS.indexOf(c.tema)>=0?c.tema:'monocromo');")
  // Un cambio de tema vuelve a teñir el globo.
  expect(PAGE).toContain('if(GLOBO.tinta)GLOBO.tinta();')
  // Los mismos temas y paneles que valida config.ts.
  const temas = /var TEMAS=(\[[^\]]*\])/.exec(PAGE)?.[1] ?? '[]'
  expect(JSON.parse(temas.replace(/'/g, '"')).sort()).toEqual([...TEMAS_CONFIG].sort())
  const ids = /var PANEL_ID=(\{[^}]*\})/.exec(PAGE)?.[1] ?? '{}'
  expect(Object.keys(JSON.parse(ids.replace(/'/g, '"').replace(/(\w+):/g, '"$1":')))).toEqual([...PANELES])
  expect(PAGE).toContain("root.style.setProperty('--acc',ac)")
  // La densidad ya no es una opción: aplicaConfig no la mira.
  expect(PAGE).not.toContain('c.densidad')
  expect(PAGE).toContain('lecturas(seg>=1&&seg<=5?seg*1000:1000)')
  expect(PAGE).toContain("ponClase(document.body,'pn-sel',!todos)")
  expect(PAGE).toContain('.pnl.pn-off{display:none!important}')
  // El reloj sigue cada segundo; la lectura de datos.js va con la opción actualizacion.
  expect(PAGE).toContain('setInterval(tick,1000);')
  expect(PAGE).not.toContain('setInterval(function(){tick();load();loadEstado()},1000)')
})

test('config: idioma en translates the labels and leaves data alone', () => {
  expect(PAGE).toContain(IDIOMA_JS)
  expect(PAGE).toContain('function tr(s){return traducir(s,EN)}')
  // El bloque se pega dentro de un template literal: sin acentos graves, dólar-llave ni barras invertidas.
  for (const c of ['`', '$' + '{', String.fromCharCode(92)]) expect(IDIOMA_JS.includes(c)).toBe(false)
  const tr = (s: string) => traducir(s, EN)
  expect(tr('Sin señal hace 12 s')).toBe('No signal for 12 s')
  expect(tr('Esperando')).toBe('Waiting')
  expect(tr('En línea')).toBe('Online')
  expect(tr('Comprobando')).toBe('Checking')
  expect(tr('datos.js no responde')).toBe('datos.js is not responding')
  expect(tr('Contexto crítico')).toBe('Critical context')
  expect(tr('Reparto por modelo')).toBe('Split by model')
  expect(tr('Últimos turnos')).toBe('Latest turns')
  expect(tr('sin datos de Opus todavía')).toBe('no data for Opus yet')
  expect(tr('sin datos de Opus todavía: sus turnos no tienen coste medido')).toBe('no data for Opus yet: its turns have no measured cost')
  expect(tr('HUD cerrado. Escribe /jarvis para abrirlo.')).toBe('HUD closed. Type /jarvis to open it.')
  for (const e of ['Pendiente', 'En curso', 'Hecha']) expect(tr(e) === e).toBe(false)
  // Los textos de señal de senal.ts tienen traducción.
  for (const s of ['En línea', 'Esperando', 'Comprobando', 'Sin señal', 'Sin datos nuevos']) expect(tr(s) === s).toBe(false)
  // Los datos (nombres de agentes, modelos, títulos de tareas) no pasan por tx().
  expect(PAGE).toContain('ponTexto(li.lastChild,t.titulo)')
  expect(PAGE).toContain('ponTexto(k[1],t.agente)')
})

// ---------- Tema natural ----------

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
const N = 'html[data-tema="natural"]'
const reglasNatural = (): string[] => PAGE.split('\n').filter(l => l.includes(N))

test('natural: the block has every color variable plus its own borders, globe tint and fonts', () => {
  const b = bloqueTema('natural')
  expect(b.length > 0).toBe(true)
  for (const v of VARS_TEMA) expect(varDe(b, v).length).toBe(7)
  for (const v of ['--borde', '--borde-2']) expect(varDe(b, v).length).toBe(7)
  for (const v of ['--globo-rgb', '--globo-rgb-w', '--globo-rgb-x']) expect(new RegExp(`${v}:\\d+,\\d+,\\d+;`).test(b)).toBe(true)
  for (const v of ['--sans:', '--cifra:', '--mono:', '--gap:', '--pad:', '--glow:0;', '--cristal:none;']) expect(b).toContain(v)
})

test('natural: main text, labels and accent reach 4.5:1 on the background and on the panels', () => {
  const b = bloqueTema('natural')
  for (const f of [varDe(b, '--bg'), varDe(b, '--panel')]) {
    for (const v of ['--txt', '--sub', '--acc', '--warn', '--crit', '--crit-txt', '--modelo-opus', '--modelo-haiku', '--modelo-fable', '--modelo-otro']) {
      const r = contraste(varDe(b, v), f)
      if (r < 4.5) throw new Error(`${v} sobre ${f}: ${r.toFixed(2)}`)
    }
  }
  expect(contraste(varDe(b, '--txt'), varDe(b, '--panel')) >= 12).toBe(true)
  // Las filas sin datos van en el gris de las etiquetas, no con transparencia.
  expect(PAGE).toContain(`${N} .cmp .zero,${N} .cmp .zero b,`)
})

test('natural: keeps the 3D globe, ring and core, and drops neon, glass, grid, scan and forced capitals', () => {
  for (const k of ['<canvas id="globe"', 'class="gring"', 'transform-style:preserve-3d', 'rotateX(72deg)', 'id="pct"']) expect(PAGE).toContain(k)
  const reglas = reglasNatural()
  for (const l of reglas) {
    for (const sel of ['.gring', '#globe', '.reactor', '.halo', '.rc']) {
      if (l.includes(`${N} ${sel}{`)) expect(l).not.toContain('display:none')
    }
    expect(/text-shadow:0 0 \d+px rgba\(var\(--acc/.test(l)).toBe(false)
    // Solo la primera letra en mayúscula (texto de frase); nada de etiquetas en mayúsculas.
    if (!l.includes('::first-letter')) expect(/text-transform:uppercase/.test(l)).toBe(false)
    expect(/backdrop-filter:blur/.test(l)).toBe(false)
  }
  expect(PAGE).toContain(`${N} .gring svg{filter:none;animation-duration:30s}`)
  expect(PAGE).toContain(`${N} .neb,${N} .floor,${N} .scan,${N} .shift{display:none}`)
  expect(PAGE).toContain(`${N} .k{text-transform:none`)
  expect(PAGE).toContain(`${N} .ph .t{font-size:var(--fv);font-weight:600;letter-spacing:0;text-transform:none;text-shadow:none}`)
  expect(PAGE).toContain(`${N} h1 .brand{display:none}`)
  // Cifras de tabla en monoespaciada; el globo toma su tinta del tema.
  expect(PAGE).toContain(`${N} td.num,`)
  expect(PAGE).toContain("tinta.n=cs?cs.getPropertyValue('--globo-rgb').trim():''")
})

test('natural: summary band layout that leaves the panel selection (pn-sel) alone', () => {
  // Franja: contexto, coste y comparativa en una fila; el detalle debajo. Con todo a la vista en pantallas grandes.
  expect(PAGE).toContain(`grid-template-areas:"head head head" "plan plan plan" "ctx cost comp" "mod chart chart" "agt hist hist" "foot foot foot"`)
  expect(PAGE).toContain(`grid-template-areas:"head head head" "ctx cost comp" "mod agt agt" "plan plan plan" "hist hist hist" "chart chart chart" "foot foot foot"`)
  // Las reglas de distribución de natural no tocan la rejilla cuando hay paneles ocultos.
  for (const l of reglasNatural()) if (l.includes('grid-template-areas')) expect(l).toContain(':not(.pn-sel) .wrap')
})

// ---------- Densidad automática y movimiento reducido ----------

const cssDe = (): string => PAGE.slice(PAGE.indexOf('<style>'), PAGE.indexOf('</style>'))
const C = 'html[data-densidad="compacto"]'

test('densidad: the page marks data-densidad on <html> by itself from the window size', () => {
  // Script en <head>, antes de pintar: el umbral (420 px de ancho o 900 x 600 de área) y la marca inicial.
  const head = PAGE.slice(0, PAGE.indexOf('<style>'))
  expect(head).toContain('var densidadDe=(' + String(densidadDe) + ');')
  expect(head).toContain("document.documentElement.setAttribute('data-densidad',densidadDe(window.innerWidth,window.innerHeight));")
  // El umbral, probado con la misma función que va en la página.
  const casos: [number, number, string][] = [
    [320, 480, 'compacto'], [375, 667, 'compacto'], [419, 2000, 'compacto'], [420, 860, 'compacto'], [800, 600, 'compacto'],
    [900, 600, 'comodo'], [768, 1024, 'comodo'], [1024, 768, 'comodo'], [1280, 720, 'comodo'], [1920, 1080, 'comodo'], [3840, 2160, 'comodo'],
    [1920, 250, 'compacto'],
  ]
  for (const [w, h, d] of casos) {
    if (densidadDe(w, h) !== d) throw new Error(`${w}x${h}: ${densidadDe(w, h)} (esperado ${d})`)
  }
  // Al cambiar de tamaño se vuelve a mirar, sin recargar ni rehacer paneles: solo cambia el atributo.
  expect(PAGE).toContain("var rz;window.addEventListener('resize',function(){ponDensidad();")
  const fn = PAGE.slice(PAGE.indexOf('function ponDensidad(){'), PAGE.indexOf('function compacto()'))
  expect(fn).toContain("root.setAttribute('data-densidad',d);")
  expect(fn).not.toContain('innerHTML')
  expect(fn).not.toContain('location')
  expect(fn).not.toContain('lista(')
  // En compacto: sin capas de efecto, sin últimos turnos ni pie, y la mitad de las partículas del globo.
  const css = cssDe()
  expect(css).toContain(`${C} #p-hist,${C} footer{display:none}`)
  expect(css).toContain(`${C} .neb,${C} .floor,${C} .scan,${C} .shift,${C} .gring svg .g2,${C} .reactor:before{display:none}`)
  expect(css).toContain(`${C} body{--glow:0;--cristal:none}`)
  expect(PAGE).toContain('nodes.forEach(function(nd,i){if(mitad&&i%2)return;')
  // Las rejillas compactas no dejan hueco para turnos ni pie.
  for (const l of css.split('\n')) if (l.includes(C) && l.includes('grid-template-areas')) expect(/"[^"]*(hist|foot)[^"]*"/.test(l)).toBe(false)
  // El globo, el anillo principal y el núcleo siguen en compacto.
  for (const l of css.split('\n')) {
    if (!l.includes(C)) continue
    for (const sel of ['#globe', '.gring{', '.gring svg{', '.reactor{', '.rc']) expect(l.includes(`${C} ${sel}`) && l.includes('display:none')).toBe(false)
  }
})

test('densidad: there is no manual compact mode (no key, no button, no class, no stored preference)', () => {
  expect(PAGE).not.toContain('id="dens"')
  expect(PAGE).not.toContain('setDens')
  expect(PAGE).not.toContain('body.compact')
  expect(PAGE).not.toContain("classList.toggle('compact'")
  expect(PAGE).not.toContain('consumo.densidad')
  expect(PAGE).not.toContain("e.key==='d'")
  expect(PAGE).not.toContain('tecla D')
  // La única tecla que quedaba era la D: la página ya no escucha el teclado.
  expect(PAGE).not.toContain("addEventListener('keydown'")
  for (const [es] of EN) expect(es.includes('densidad') || es === 'Compacto' || es === 'Cómodo').toBe(false)
})

test('movimiento reducido: every animation stops, the globe stays still and numbers jump to their value', () => {
  const css = cssDe()
  expect(css).toContain('@media (prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important;')
  expect(PAGE).toContain("var MOV=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):null;")
  expect(PAGE).toContain('if(document.hidden||quieto())return;')
  expect(PAGE).toContain('if(from===to||document.hidden||quieto()){t.v=to;ponTexto(el,fmt(to));return}')
  expect(PAGE).toContain('if(quieto()||compacto())return;')
  // La lectura de datos no depende del movimiento: el render sigue igual.
  const render = PAGE.slice(PAGE.indexOf('function render(d){'), PAGE.indexOf('function pintaSenal(){'))
  expect(render).not.toContain('quieto')
})

test('accesibilidad: visible focus on controls and the natural labels are not forced to capitals', () => {
  const css = cssDe()
  expect(css).toContain(':focus-visible{outline:2px solid var(--acc);outline-offset:3px')
  expect(css).toContain('.pll summary:focus-visible{outline:2px solid var(--acc)')
  expect(css).not.toMatch(/outline:none/)
  // Textos de la página sin prefijos de consola.
  const html = PAGE.slice(PAGE.indexOf('<body>'), PAGE.indexOf('<script>', PAGE.indexOf('<body>')))
  expect(/SYS\s*\/\//.test(html)).toBe(false)
  expect(html).toContain('Plan · sin tareas activas')
  expect(css).toContain('html[data-tema="natural"] .plt{font-size:var(--fv);letter-spacing:0;text-transform:none}')
})

// ---------- Moneda ----------

const NB = String.fromCharCode(160)
const eur = (txt: string) => txt.split(' ').join(NB)

test('moneda: 1 USD at 0.92 is 0,92 €, USD is not converted and a bad rate leaves dollars', () => {
  expect(convertirMoneda(1, 'EUR', 0.92)).toBe(0.92)
  expect(formatoMoneda(convertirMoneda(1, 'EUR', 0.92), 'EUR', 'es-ES')).toBe(eur('0,92 €'))
  expect(convertirMoneda(1, 'USD', 0.92)).toBe(1)
  expect(convertirMoneda(2.5, 'USD', 0.5)).toBe(2.5)
  for (const t of [0, -1, NaN, Infinity]) expect(convertirMoneda(3, 'EUR', t)).toBe(3)
  expect(convertirMoneda(10, 'EUR', 0.5)).toBe(5)
})

test('moneda: currency format by language, € after the number in Spanish, 4 decimals below 1 and 2 from 1', () => {
  expect(formatoMoneda(1234.56, 'EUR', 'es-ES')).toBe(eur('1.234,56 €'))
  expect(formatoMoneda(1234.56, 'EUR', 'en-US')).toBe('€1,234.56')
  expect(formatoMoneda(0, 'EUR', 'es-ES')).toBe(eur('0,00 €'))
  // Menos de 1: 4 decimales, o 2 si ya es exacto con 2.
  expect(formatoMoneda(0.12345, 'EUR', 'es-ES')).toBe(eur('0,1235 €'))
  expect(formatoMoneda(0.0042, 'EUR', 'en-US')).toBe('€0.0042')
  expect(formatoMoneda(0.1, 'EUR', 'es-ES')).toBe(eur('0,10 €'))
  expect(formatoMoneda(-0.0123, 'EUR', 'es-ES')).toBe(eur('-0,0123 €'))
  // Nunca 3 decimales: 0.103 sale con 4.
  expect(formatoMoneda(0.103, 'EUR', 'es-ES')).toBe(eur('0,1030 €'))
  expect(formatoMoneda(0.92, 'EUR', 'en-US')).toBe('€0.92')
  // Desde 1: 2 decimales.
  expect(formatoMoneda(12.3456, 'EUR', 'es-ES')).toBe(eur('12,35 €'))
  expect(formatoMoneda(1, 'EUR', 'en-US')).toBe('€1.00')
  // Con USD, dólares con el formato del idioma.
  expect(formatoMoneda(0.25, 'USD', 'en-US')).toBe('$0.25')
  expect(formatoMoneda(1234.5, 'USD', 'es-ES')).toBe(eur('1.234,50 US$'))
})

test('moneda: the page converts once, in dinero(), and every cost on the HUD goes through it', () => {
  // Las funciones de moneda.ts van tal cual en la página (dentro de un template literal).
  expect(PAGE).toContain(MONEDA_JS)
  for (const c of ['`', '$' + '{', String.fromCharCode(92)]) expect(MONEDA_JS.includes(c)).toBe(false)
  const js = PAGE.slice(PAGE.indexOf('<script>', PAGE.indexOf('<body>')))
  // Un solo sitio convierte: aMoneda() (convertirMoneda solo aparece en su definición y ahí).
  expect(js.split('convertirMoneda(').length - 1).toBe(2)
  expect(js).toContain('function aMoneda(usd){return convertirMoneda(usd,MONEDA,TIPO)}')
  expect(js).toContain('function dinero(usd){return importe(aMoneda(usd))}')
  // importe() solo da formato: nunca recibe algo ya pasado por dinero() ni vuelve a convertir.
  expect(js).toContain('function importe(v){return formatoMoneda(v,MONEDA,LOC)}')
  expect(js).not.toMatch(/dinero\(aMoneda|aMoneda\(aMoneda|dinero\(dinero|aMoneda\(ctop/)
  // Cifra principal, último turno, historial, comparativa, leyenda de la comparativa y tooltip de la gráfica.
  for (const k of [
    "tween('costev',Number(d.coste||0),dinero);",
    "(tx('Último turno')+' ≈ '+dinero(last.coste))",
    "ponTexto(k[4],t.coste!=null?dinero(t.coste):'—');",
    "ponTexto($id('cvreal'),dinero(real));",
    "ponTexto($id('cvopus'),ok?dinero(est):'—');",
    "ponTexto($id('caha'),dinero(ah));",
    "' · '+dinero(x.coste||0)",
    "(t.coste!=null?' · '+dinero(t.coste):'')",
    "importe(ctop*i/4)",
  ]) expect(js).toContain(k)
  // Ni cifras sin formato ni la etiqueta USD fija.
  expect(js).not.toContain('toFixed(4)')
  expect(js).not.toContain("+' USD'")
  expect(PAGE).not.toContain('<small>USD</small>')
  // La moneda llega en config y un cambio vuelve a pintar la gráfica.
  expect(js).toContain("var mon=c.moneda==='USD'?'USD':'EUR'")
  expect(js).toContain("if(mon!==MONEDA||tc!==TIPO){MONEDA=mon;TIPO=tc;CHART=''}")
  // La misma composición que dinero(): formato(conversión(usd)), una sola vez. 1 USD con 0.92 da 0,92 €.
  const dinero = (usd: number) => formatoMoneda(convertirMoneda(usd, 'EUR', 0.92), 'EUR', 'es-ES')
  expect(dinero(1)).toBe(eur('0,92 €'))
  expect(dinero(1)).not.toBe(formatoMoneda(convertirMoneda(convertirMoneda(1, 'EUR', 0.92), 'EUR', 0.92), 'EUR', 'es-ES'))
})

test(
  'moneda: the cost is stored in dollars in datos.js; only the page converts it',
  { options: { dataDir: '/prueba/consumo', moneda: 'EUR', tipoCambio: 0.5 } },
  async ($, on) => {
    mock.clock(on, { now: 1_000 })
    const writes: { path: string; text: string }[] = []
    on('fs.write', (_, e) => {
      writes.push(e)
      return { value: undefined }
    })
    on('process.run', () => ok)
    on('session.start', (_, e) => ({ cwd: e.cwd }))
    on('session.model', () => ({ value: 'claude-opus-5-5' }))
    let usd = 0.5
    on('session.usage', () => ({ value: { startedAt: 0, context: { tokens: 10, window: 200000, percent: 0 }, rateLimits: [], cost: { usd } } }))
    on('turn.complete', () => ({ text: '' }))
    await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
    usd = 0.75
    await $.turn.complete({
      answer: '', durationMs: 1, isAborted: false, reason: 'answer', turnId: 't1',
      usage: { model: 'claude-opus-5-5', input_tokens: 10, output_tokens: 10, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
    })
    const w = writes.filter(x => x.path.endsWith('datos.js')).at(-1)
    const d = JSON.parse((w?.text ?? '').replace(/^window\.CONSUMO = /, '').replace(/;$/, ''))
    expect(d.config.moneda).toBe('EUR')
    expect(d.config.tipoCambio).toBe(0.5)
    // En dólares, sin convertir: 0.75 acumulado y 0.25 el turno (no 0.375 ni 0.125).
    expect(d.coste).toBe(0.75)
    expect(d.historial[0].coste).toBe(0.25)
    expect(d.comparativa.costeReal).toBe(0.25)
  },
)

test('config: moneda and tipoCambio are validated, with a warning for bad values', () => {
  expect(CONFIG_DEFAULT.moneda).toBe('EUR')
  expect(CONFIG_DEFAULT.tipoCambio).toBe(0.92)
  expect(leerConfig({ moneda: 'usd' }).config.moneda).toBe('USD')
  expect(leerConfig({ moneda: 'EUR', tipoCambio: 0.86 }).config).toEqual({ ...CONFIG_DEFAULT, tipoCambio: 0.86 })
  expect(leerConfig({ tipoCambio: '0,9' }).config.tipoCambio).toBe(0.9)
  const bad = leerConfig({ moneda: 'GBP', tipoCambio: -1 })
  expect(bad.config).toEqual(CONFIG_DEFAULT)
  expect(bad.avisos).toHaveLength(2)
  expect(bad.avisos.some(a => a.includes('moneda') && a.includes('EUR'))).toBe(true)
  expect(bad.avisos.some(a => a.includes('tipoCambio') && a.includes('0.92'))).toBe(true)
  expect(leerConfig({ tipoCambio: 0 }).avisos).toHaveLength(1)
})

// ---------- Tema monocromo ----------

const M = 'html[data-tema="monocromo"]'
const gris = (hex: string) => hex.length === 7 && hex.slice(1, 3) === hex.slice(3, 5) && hex.slice(3, 5) === hex.slice(5, 7)

test('monocromo: exists in the page and in config, and natural is still available with the tema option', () => {
  expect(TEMAS_CONFIG).toContain('monocromo')
  expect(bloqueTema('monocromo').length > 0).toBe(true)
  expect(leerConfig({ tema: 'monocromo' }).config.tema).toBe('monocromo')
  expect(leerConfig({ tema: 'natural' }).config.tema).toBe('natural')
  expect(leerConfig({ tema: 'natural' }).avisos).toHaveLength(0)
})

test('monocromo is the default theme: in config, in the html and in the page fallback', () => {
  expect(CONFIG_DEFAULT.tema).toBe('monocromo')
  expect(leerConfig({}).config.tema).toBe('monocromo')
  // Un tema que no vale vuelve al defecto, monocromo.
  expect(leerConfig({ tema: 'iron' }).config.tema).toBe('monocromo')
  expect(PAGE).toContain('<html lang="es" data-tema="monocromo">')
  expect(PAGE).not.toContain('data-tema="natural">')
  expect(PAGE).toContain(':root:not([data-tema]),html[data-tema="monocromo"]{')
  expect(PAGE).toContain("TEMAS.indexOf(c.tema)>=0?c.tema:'monocromo'")
})

test('monocromo: only white, greys and black, with no accent colour anywhere', () => {
  const b = bloqueTema('monocromo')
  const reglas = PAGE.split('\n').filter(l => l.includes(M) && !l.includes(M + '{'))
  for (const t of [b, ...reglas]) {
    for (const h of t.match(/#[0-9a-f]{6}\b/gi) ?? []) if (!gris(h.toLowerCase())) throw new Error(`color en monocromo: ${h}`)
    expect(/#[0-9a-f]{3}\b(?![0-9a-f])/i.test(t.replace(/#[0-9a-f]{6}/gi, ''))).toBe(false)
    for (const m of t.matchAll(/(?:^|[^0-9])(\d{1,3}),(\d{1,3}),(\d{1,3})(?=[;,)])/g)) {
      if (!(m[1] === m[2] && m[2] === m[3])) throw new Error(`rgb con color en monocromo: ${m[0]}`)
    }
  }
  for (const v of ['--globo-rgb', '--globo-rgb-w', '--globo-rgb-x', '--ring-rgb']) expect(new RegExp(`${v}:(\\d+),\\1,\\1;`).test(b)).toBe(true)
  // La opción acento no tiñe el monocromo.
  expect(PAGE).toContain("if(c.tema==='monocromo')ac=ACENTO_DEF;")
})

test('monocromo: text reaches 4.5:1 on the background, the panels and the critical panel', () => {
  const b = bloqueTema('monocromo')
  const critico = /body\.lv-x #p-ctx\{--glass:(#[0-9a-f]{6})/.exec(PAGE)?.[1] ?? ''
  expect(critico.length).toBe(7)
  for (const f of [varDe(b, '--bg'), varDe(b, '--panel'), varDe(b, '--thbg'), critico]) {
    for (const v of ['--txt', '--sub', '--acc', '--acc2', '--warn', '--crit', '--crit-txt', '--ok', '--modelo-opus', '--modelo-haiku', '--modelo-fable', '--modelo-otro']) {
      const r = contraste(varDe(b, v), f)
      if (r < 4.5) throw new Error(`${v} sobre ${f}: ${r.toFixed(2)}`)
    }
  }
  // Alerta crítica invertida: texto del fondo sobre --crit.
  expect(contraste(varDe(b, '--bg'), varDe(b, '--crit')) >= 4.5).toBe(true)
  // Sin transparencias que bajen el contraste en las filas sin datos.
  expect(PAGE).toContain(`${M} .cmp .zero,${M} .cmp .zero b,`)
})

test('monocromo: keeps the 3D globe, ring and core and tells the critical alert apart by tone and border', () => {
  for (const l of PAGE.split('\n').filter(x => x.includes(M))) {
    for (const sel of ['.gring', '#globe', '.reactor', '.halo', '.rc', '.face']) {
      if (l.includes(`${M} ${sel}`)) expect(l).not.toContain('display:none')
    }
  }
  expect(PAGE).toContain(`${M} .neb,${M} .scan{display:none}`)
  // Alto: borde discontinuo. Crítico: invertido, doble borde, panel más claro y arco más grueso.
  expect(PAGE).toContain(`${M} #al-ctx.w{border-style:dashed`)
  expect(PAGE).toContain(`${M} #al-ctx.x,${M} #al-sig{color:var(--bg);background:var(--crit);border:2px solid var(--crit)`)
  expect(PAGE).toContain(`${M} body.lv-w #p-ctx{outline:1px dashed var(--warn)`)
  expect(PAGE).toMatch(/body\.lv-x #p-ctx\{--glass:#1f1f1f;[^}]*outline:4px double var\(--crit\)/)
  expect(PAGE).toContain(`${M} body.lv-x #arc{stroke-width:4}`)
})
