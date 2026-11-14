import { expect, mock, test } from 'claude-code/testing'

import { argsVentana, AREAS, colocar, COLOCAR_JS, DISPOSICION_CSS, DISPOSICIONES, fila, leerVentana, leerVista, LUGARES, normalizaVista, ponPuestos, VISTA_DEFAULT } from './disposicion'
import { ponAttr } from './dom'
import { EN, traducir } from './idioma'
import { PAGE } from './page'

const ok = { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
const css = (): string => PAGE.slice(PAGE.indexOf('<style>'), PAGE.indexOf('</style>'))
const NOMBRADAS = DISPOSICIONES.filter(d => d !== 'auto')

// ---------- Un DOM falso mínimo para la colocación de la página ----------
// La página aplica la opción con normalizaVista(), colocar() y ponPuestos() de disposicion.ts (las mismas funciones que
// van pegadas en index.html) y ponAttr() de dom.ts. Cada nodo apunta las llamadas que moverían el DOM: tienen que
// quedarse en cero.
type Falso = {
  attrs: Record<string, string>
  movidas: number
  getAttribute(k: string): string | null
  setAttribute(k: string, v: string): void
  insertBefore(): void
  appendChild(): void
  removeChild(): void
}
function nodo(): Falso {
  const n: Falso = {
    attrs: {},
    movidas: 0,
    getAttribute: k => (k in n.attrs ? (n.attrs[k] as string) : null),
    setAttribute: (k, v) => {
      n.attrs[k] = String(v)
    },
    insertBefore: () => void n.movidas++,
    appendChild: () => void n.movidas++,
    removeChild: () => void n.movidas++,
  }
  return n
}
// Como ponLugar() de la página: fuera son los paneles que la página no muestra por otros motivos.
function pagina(fuera: Record<string, boolean> = {}) {
  const els: Record<string, Falso> = Object.fromEntries(LUGARES.map(l => [l, nodo()]))
  const root = nodo()
  let ultima: ReturnType<typeof colocar> | null = null
  const aplica = (v: unknown) => {
    const vista = normalizaVista(v)
    root.setAttribute('data-disposicion', vista.disposicion)
    ultima = colocar(vista, fuera)
    ponPuestos(els, root, ultima, ponAttr as never)
    return vista
  }
  return { els, root, aplica, panel: (l: string) => els[l] as Falso, ultima: () => ultima }
}

// ---------- Opciones ----------

test('disposicion: nine layouts, validated with a warning and auto as the fallback', () => {
  expect(DISPOSICIONES.length >= 8).toBe(true)
  expect([...DISPOSICIONES]).toEqual(['auto', 'columna', 'franja', 'tres-columnas', 'nucleo-central', 'barra-lateral', 'barra-inferior', 'mosaico', 'foco'])
  for (const d of DISPOSICIONES) {
    const r = leerVista({ disposicion: d })
    expect(r.vista.disposicion).toBe(d)
    expect(r.avisos).toHaveLength(0)
  }
  expect(leerVista({ disposicion: ' Mosaico ' }).vista.disposicion).toBe('mosaico')
  const mal = leerVista({ disposicion: 'rejilla' })
  expect(mal.vista.disposicion).toBe('auto')
  expect(mal.avisos.some(a => a.includes('disposicion') && a.includes('auto'))).toBe(true)
  expect(leerVista({}).vista).toEqual(VISTA_DEFAULT)
  expect(leerVista({}).avisos).toHaveLength(0)
})

test('orden, tamanos and ocultos: names are checked, unknown ones warn, missing panels keep the default order', () => {
  const o = leerVista({ orden: ['grafica', 'Histórico', 'nada', 'grafica'] })
  expect(o.vista.orden).toEqual(['grafica', 'historico', 'contexto', 'coste', 'comparativa', 'reparto', 'agentes', 'plan', 'historial'])
  expect(o.avisos).toHaveLength(1)
  expect(o.avisos[0]).toContain('nada')
  expect(leerVista({ orden: 'coste, contexto' }).vista.orden.slice(0, 3)).toEqual(['coste', 'contexto', 'comparativa'])

  const t = leerVista({ tamanos: ['contexto:grande', 'historico=pequeño', 'grafica:enorme', 'x:grande'] })
  expect(t.vista.tamanos).toEqual({ contexto: 'grande', historico: 'pequeno' })
  expect(t.avisos).toHaveLength(1)
  expect(t.avisos[0]).toContain('grafica:enorme')
  // Un objeto (settings.json) y el mismo objeto en JSON valen igual.
  expect(leerVista({ tamanos: { contexto: 'grande', historico: 'pequeno' } } as never).vista.tamanos).toEqual({ contexto: 'grande', historico: 'pequeno' })
  expect(leerVista({ tamanos: '{"coste":"grande"}' }).vista.tamanos).toEqual({ coste: 'grande' })

  const h = leerVista({ ocultos: ['plan', 'acumulado', 'zzz'] })
  expect(h.vista.ocultos).toEqual(['plan', 'historico'])
  expect(h.avisos).toHaveLength(1)
  const todos = leerVista({ ocultos: [...LUGARES] })
  expect(todos.vista.ocultos).toEqual([])
  expect(todos.avisos.some(a => a.includes('todos'))).toBe(true)
})

test('escala: 0.8 to 1.4; out of range or not a number uses 1 and leaves a warning', () => {
  expect(leerVista({ escala: 0.8 }).vista.escala).toBe(0.8)
  expect(leerVista({ escala: 1.4 }).vista.escala).toBe(1.4)
  expect(leerVista({ escala: '1,2' }).vista.escala).toBe(1.2)
  for (const v of [0.79, 1.41, 3, -1, 'grande', '']) {
    const r = leerVista({ escala: v })
    expect(r.vista.escala).toBe(1)
    expect(r.avisos).toHaveLength(1)
    expect(r.avisos[0]).toContain('escala')
    expect(r.avisos[0]).toContain('0.8–1.4')
  }
})

test(
  'escala out of range reaches datos.js as 1 and the warning goes to the log',
  { options: { dataDir: '/prueba/consumo', escala: 2, disposicion: 'mosaico', orden: ['coste'], tamanos: ['contexto:grande'] } },
  async ($, on) => {
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
    on('session.model', () => ({ value: 'claude-opus-5' }))
    on('session.usage', () => ({ value: { startedAt: 0, context: { tokens: 0, window: 200000, percent: 0 }, rateLimits: [] } }))
    await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
    const d = writes.filter(w => w.path === '/prueba/consumo/datos.js').at(-1)?.text ?? ''
    const data = JSON.parse(d.slice('window.CONSUMO = '.length, -1)) as { vista: { disposicion: string; escala: number; orden: string[]; tamanos: object } }
    expect(data.vista.disposicion).toBe('mosaico')
    expect(data.vista.escala).toBe(1)
    expect(data.vista.orden[0]).toBe('coste')
    expect(data.vista.tamanos).toEqual({ contexto: 'grande' })
    expect(logs.some(l => l.startsWith('consumo: escala') && l.includes('se usa 1'))).toBe(true)
  },
)

test('ventana: known sizes become --window-size or --start-maximized; an unknown value uses auto with a warning', () => {
  expect(argsVentana('auto')).toEqual([])
  expect(argsVentana('pequena')).toEqual(['--window-size=420,860'])
  expect(argsVentana('mediana')).toEqual(['--window-size=900,700'])
  expect(argsVentana('grande')).toEqual(['--window-size=1280,800'])
  expect(argsVentana('completa')).toEqual(['--start-maximized'])
  expect(leerVentana({ ventana: 'Pequeña' }).ventana).toBe('pequena')
  expect(leerVentana({}).avisos).toHaveLength(0)
  for (const v of ['gigante', '800x600', 3, true]) {
    const r = leerVentana({ ventana: v })
    expect(r.ventana).toBe('auto')
    expect(r.avisos).toHaveLength(1)
    expect(r.avisos[0]).toContain('auto')
    expect(argsVentana(r.ventana)).toEqual([])
  }
})

test('ventana: the mod adds the size to the Edge line', { options: { dataDir: '/prueba/consumo', ventana: 'mediana' } }, async ($, on) => {
  mock.clock(on, { now: 1_000 })
  const runs: (readonly string[])[] = []
  on('fs.write', () => ({ value: undefined }))
  on('process.run', (_, e) => {
    runs.push(e.argv)
    return ok
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens: 0, window: 200000, percent: 0 }, rateLimits: [] } }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const edge = runs.find(a => a.includes('msedge')) ?? []
  expect(edge.some(x => x.startsWith('--app=file:///prueba/consumo/index.html'))).toBe(true)
  expect(edge.at(-1)).toBe('--window-size=900,700')
})

test('ventana: with auto (the default) the Edge line has no size', { options: { dataDir: '/prueba/consumo' } }, async ($, on) => {
  mock.clock(on, { now: 1_000 })
  const runs: (readonly string[])[] = []
  on('fs.write', () => ({ value: undefined }))
  on('process.run', (_, e) => {
    runs.push(e.argv)
    return ok
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens: 0, window: 200000, percent: 0 }, rateLimits: [] } }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const edge = runs.find(a => a.includes('msedge')) ?? []
  expect(edge.some(x => x.startsWith('--window-size') || x === '--start-maximized')).toBe(false)
})

// ---------- CSS ----------

test('each layout has its own block with grid-template-areas, applied through data-disposicion on <html>', () => {
  const c = css()
  expect(c).toContain(DISPOSICION_CSS)
  for (const d of NOMBRADAS) {
    const reglas = DISPOSICION_CSS.split('\n').filter(l => l.includes(`html[data-disposicion="${d}"]`))
    expect(reglas.some(l => l.includes('grid-template-areas:'))).toBe(true)
  }
  // Base de las disposiciones con nombre: 24 columnas, cabecera arriba, sin plantillas de auto.
  expect(DISPOSICION_CSS).toContain(':where(html[data-disposicion]:not([data-disposicion="auto"])) .wrap{grid-template-columns:repeat(24,minmax(0,1fr))!important')
  // Cada fila de cada plantilla tiene 24 celdas y solo nombres de cabecera, puesto o "." (nada que cree columnas implícitas).
  for (const m of DISPOSICION_CSS.matchAll(/grid-template-areas: ((?:"[^"]*" ?)+)/g)) {
    for (const f of (m[1] as string).match(/"[^"]*"/g) ?? []) {
      const celdas = f.slice(1, -1).split(' ')
      expect(celdas).toHaveLength(24)
      for (const x of celdas) expect(['head', '.', 'mas', ...AREAS].includes(x)).toBe(true)
    }
  }
  expect(() => fila(['head', 23])).toThrow()
  // Se pega en un template literal: sin acentos graves, dólar-llave ni barras invertidas.
  for (const ch of ['`', '$' + '{', String.fromCharCode(92)]) expect(DISPOSICION_CSS.includes(ch)).toBe(false)
  // La página arranca en auto y aplica la opción solo con atributos.
  expect(PAGE).toContain("document.documentElement.setAttribute('data-disposicion','auto');")
  expect(PAGE).toContain('aplicaVista(d.vista);')
  expect(PAGE).toContain("ponAttr(root,'data-disposicion',VISTA.disposicion);")
  expect(PAGE).toContain(COLOCAR_JS)
  for (const ch of ['`', '$' + '{', String.fromCharCode(92)]) expect(COLOCAR_JS.includes(ch)).toBe(false)
  // Mismos paneles en la página y en disposicion.ts (la lista de disposiciones solo vive en disposicion.ts).
  expect(PAGE).not.toContain('var DISPOSICIONES=')
  const ids = /var LUGAR_ID=(\{[^}]*\})/.exec(PAGE)?.[1] ?? '{}'
  expect(Object.keys(JSON.parse(ids.replace(/'/g, '"').replace(/(\w+):/g, '"$1":')))).toEqual([...LUGARES])
})

test('each layout sets data-disposicion and its featured spots (with the page functions on a fake DOM)', () => {
  const zonaA: Record<string, number> = { auto: 0, columna: 0, franja: 3, 'tres-columnas': 0, 'nucleo-central': 5, 'barra-lateral': 3, 'barra-inferior': 3, mosaico: 0, foco: 2 }
  const conArea = ['nucleo-central', 'barra-lateral', 'foco']
  for (const d of DISPOSICIONES) {
    const p = pagina()
    p.aplica({ ...VISTA_DEFAULT, disposicion: d })
    expect(p.root.attrs['data-disposicion']).toBe(d)
    expect(p.root.attrs['data-pocos']).toBe('0')
    LUGARES.forEach((l, i) => {
      const el = p.panel(l)
      expect(el.attrs['data-puesto']).toBe(String(i + 1))
      expect(el.attrs['data-zona']).toBe(i < (zonaA[d] ?? 0) ? 'a' : 'b')
      // auto: el área de siempre; con nombre: área solo para los puestos destacados que la tienen.
      const area = d === 'auto' ? AREAS[i] : conArea.includes(d) && i < (zonaA[d] ?? 0) ? AREAS[i] : ''
      expect(el.attrs['data-area']).toBe(area)
    })
    // Su bloque CSS usa esas áreas dentro de su plantilla.
    if (conArea.includes(d)) {
      for (const a of AREAS.slice(0, zonaA[d])) expect(DISPOSICION_CSS).toContain(`html[data-disposicion="${d}"]:not([data-pocos="1"]) .pnl[data-area="${a}"]{grid-area:${a}!important}`)
    }
  }
  // Un valor que no existe deja auto.
  const p = pagina()
  p.aplica({ disposicion: 'nada' })
  expect(p.root.attrs['data-disposicion']).toBe('auto')
})

test('orden and tamanos only change attributes and CSS order: the DOM is never moved', () => {
  const p = pagina()
  const orden = ['grafica', 'coste', 'contexto', 'historico', 'plan', 'reparto', 'agentes', 'comparativa', 'historial']
  p.aplica({ ...VISTA_DEFAULT, disposicion: 'franja', orden, tamanos: { contexto: 'grande', historico: 'pequeno' } })
  orden.forEach((l, i) => expect(p.panel(l as never).attrs['data-puesto']).toBe(String(i + 1)))
  expect(p.panel('contexto').attrs['data-tam']).toBe('grande')
  expect(p.panel('historico').attrs['data-tam']).toBe('pequeno')
  expect(p.panel('coste').attrs['data-tam']).toBe('normal')
  // El tamaño del primer puesto (grafica) va en <html> para las plantillas que lo usan.
  expect(p.root.attrs['data-t1']).toBe('normal')
  for (const el of Object.values(p.els)) expect(el.movidas).toBe(0)
  // CSS: order por puesto y span por tamaño.
  for (let n = 1; n <= 9; n++) expect(DISPOSICION_CSS).toContain(`.pnl[data-puesto="${n}"]{order:${n}}`)
  expect(DISPOSICION_CSS).toContain('.pnl[data-tam="pequeno"]{--sp:var(--sb-p,24)}')
  expect(DISPOSICION_CSS).toContain('.pnl[data-tam="grande"]{--sp:var(--sb-g,24)}')
  expect(DISPOSICION_CSS).toContain('grid-column:span var(--sp)!important')
  // auto con otro orden: el panel del puesto N toma el área N de la plantilla de siempre.
  const a = pagina()
  a.aplica({ ...VISTA_DEFAULT, orden: ['coste', 'contexto'] })
  expect(a.panel('coste').attrs['data-area']).toBe('ctx')
  expect(a.panel('contexto').attrs['data-area']).toBe('cost')
  // La página no reconstruye nada: el bloque no usa innerHTML ni mueve nodos.
  const bloque = PAGE.slice(PAGE.indexOf('/*COLOCAR*/'), PAGE.indexOf('// Si los datos no cambian (solo el latido)'))
  for (const k of ['innerHTML', 'appendChild', 'insertBefore', 'removeChild', 'lista(']) expect(bloque.includes(k)).toBe(false)
  // Cambiar de disposición tampoco toca los datos: render sigue con la firma de siempre.
  expect(PAGE).toContain('if(f===FIRMA)return;\n  aplicaVista(d.vista);')
})

test('hiding panels leaves no gaps: positions are renumbered, hidden ones get none, and few panels fall back to the flow', () => {
  for (const d of DISPOSICIONES) {
    const p = pagina()
    p.aplica({ ...VISTA_DEFAULT, disposicion: d, ocultos: ['coste', 'plan', 'historial'] })
    const puestos = LUGARES.map(l => Number(p.panel(l).attrs['data-puesto']))
    expect(puestos.filter(n => n > 0).sort((x, y) => x - y)).toEqual([1, 2, 3, 4, 5, 6])
    for (const l of ['coste', 'plan', 'historial'] as const) {
      expect(p.panel(l).attrs['data-puesto']).toBe('0')
      expect(p.panel(l).attrs['data-area']).toBe('')
    }
    // Solo hay áreas con nombre para los puestos que existen (sin área vacía en la plantilla).
    const areas = LUGARES.map(l => p.panel(l).attrs['data-area']).filter(Boolean)
    if (d !== 'auto') for (const a of areas) expect(AREAS.indexOf(a as never) < 6).toBe(true)
  }
  // Menos paneles que puestos destacados: data-pocos y todos a la rejilla que se rellena sola.
  const p = pagina()
  p.aplica({ ...VISTA_DEFAULT, disposicion: 'nucleo-central', ocultos: ['coste', 'comparativa', 'reparto', 'agentes', 'plan', 'historico'] })
  expect(p.root.attrs['data-pocos']).toBe('1')
  for (const l of LUGARES) expect(p.panel(l).attrs['data-area']).toBe('')
  // Sin histórico (ac-off) y en compacto (sin últimos turnos) tampoco cuentan.
  const c = pagina({ historico: true, historial: true })
  c.aplica({ ...VISTA_DEFAULT, disposicion: 'mosaico' })
  expect(c.panel('historico').attrs['data-puesto']).toBe('0')
  expect(c.panel('historial').attrs['data-puesto']).toBe('0')
  expect(c.panel('grafica').attrs['data-puesto']).toBe('7')
  // CSS: los ocultos no ocupan sitio y las plantillas con nombre no se aplican con pocos paneles.
  expect(DISPOSICION_CSS).toContain('.pnl.lg-off{display:none!important}')
  for (const l of DISPOSICION_CSS.split('\n')) if (/grid-template-areas: "head[^"]*" "/.test(l)) expect(l).toContain(':not([data-pocos="1"])')
  // auto con un oculto: la rejilla que se rellena sola de siempre (pn-sel).
  expect(PAGE).toContain('if(VISTA.ocultos.length)todos=false;')
})

test('text stays at 14 px or more in every layout and at every scale', () => {
  const c = css()
  // Los tamaños base escalan pero no bajan de 14 px (etiquetas) ni de 16 px (valores).
  expect(c).toContain('--fk:clamp(14px,calc((.32vw + .38vh + 5px)*var(--escala,1)),calc(22px*var(--escala,1)));')
  expect(c).toContain('--fv:clamp(16px,calc((.42vw + .5vh + 5px)*var(--escala,1)),calc(27px*var(--escala,1)));')
  // Con la escala mínima (0.8) el tope de cada clamp sigue por encima de su mínimo.
  expect(22 * 0.8 >= 14 && 27 * 0.8 >= 16 && 80 * 0.8 >= 34).toBe(true)
  // Ningún tamaño de letra de las disposiciones por debajo de 14 px.
  const sizes = [...DISPOSICION_CSS.matchAll(/font(?:-size)?:\s*(?:clamp\()?(\d+(?:\.\d+)?)px/g)].map(m => Number(m[1]))
  expect(sizes.filter(px => px < 14)).toEqual([])
  expect(DISPOSICION_CSS).not.toMatch(/font-size:\s*(?:[0-9]|1[0-3])(?:\.\d+)?px/)
  // La escala va en <html> como variable, con el mismo rango que valida el mod.
  expect(PAGE).toContain("ponEstilo(root,'--escala',String(VISTA.escala));")
  expect(String(normalizaVista)).toContain('es >= 0.8 && es <= 1.4 ? es : 1')
  expect(normalizaVista({ escala: 9 }).escala).toBe(1)
  expect(normalizaVista({ escala: 0.5 }).escala).toBe(1)
  expect(normalizaVista({ escala: 1.3 }).escala).toBe(1.3)
})

test('foco: the rest goes in a folding list with a translated button, remembered in this browser', () => {
  expect(PAGE).toContain('id="focomas"')
  expect(DISPOSICION_CSS).toContain('html[data-disposicion="foco"]:not([data-foco="abierto"]) .pnl[data-zona="b"]{display:none!important}')
  const p = pagina()
  p.aplica({ ...VISTA_DEFAULT, disposicion: 'foco' })
  // Contexto y coste destacados; los otros siete van a la lista (el número sale en el botón).
  expect(p.ultima()?.resto).toBe(7)
  expect(LUGARES.filter(l => p.panel(l).attrs['data-zona'] === 'a')).toEqual(['contexto', 'coste'])
  expect(PAGE).toContain("ponAttr(document.documentElement,'data-foco',FOCO_ABIERTO?'abierto':'cerrado');")
  expect(PAGE).toContain("ponAttr($id('focomas'),'aria-expanded',FOCO_ABIERTO?'true':'false');")
  expect(PAGE).toContain("ponTexto($id('focomasv'),tx(FOCO_ABIERTO?'Menos paneles':'Más paneles'));")
  expect(traducir('Más paneles', EN)).toBe('More panels')
  expect(traducir('Menos paneles', EN)).toBe('Fewer panels')
  expect(PAGE).toContain("try{localStorage.setItem(FKEY,FOCO_ABIERTO?'1':'0')}catch(e){}")
})

test('theme, accent and language keep working: layout rules win over the theme layouts and touch no colour or text', () => {
  // Las plantillas de las disposiciones van con !important: las del tema natural (sin él) no las pisan.
  for (const w of DISPOSICION_CSS.matchAll(/\.wrap\{[^}]*\}/g)) {
    for (const m of w[0].matchAll(/grid-template-(?:areas|columns|rows):[^;}]*/g)) expect(m[0].endsWith('!important')).toBe(true)
  }
  // Ninguna regla de disposición pone colores fijos ni depende de un tema o idioma concreto.
  expect(DISPOSICION_CSS).not.toMatch(/#[0-9a-f]{3,6}\b/i)
  expect(DISPOSICION_CSS).not.toContain('data-tema')
  expect(DISPOSICION_CSS).not.toContain('lang=')
  // El globo 3D y el anillo no se ocultan en ninguna disposición.
  for (const l of DISPOSICION_CSS.split('\n')) for (const sel of ['#globe', '.gring', '.halo', '.reactor{', '.rc']) expect(l.includes(sel) && l.includes('display:none')).toBe(false)
  // aplicaVista va antes que aplicaConfig: tema, acento e idioma se aplican igual con cualquier disposición.
  expect(PAGE.indexOf('aplicaVista(d.vista);') < PAGE.indexOf('aplicaConfig(d.config);', PAGE.indexOf('function render(d){'))).toBe(true)
})
