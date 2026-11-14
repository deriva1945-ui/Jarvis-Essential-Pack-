import type { PluginOptions } from 'claude-code'

import type { HudDisposicion, HudLugar, HudTamano, HudVentana, HudVista } from '../types'

// Colocación del HUD (userConfig de plugin.json): disposicion, orden, tamanos, escala, ocultos y ventana.
// Va aparte de config.ts para no tocar las opciones de color, idioma y paneles. Los defectos coinciden con los "default"
// del manifiesto. La página recibe el resultado en datos.js como "vista" (solo lectura); ventana solo la usa el mod.

export const DISPOSICIONES: readonly HudDisposicion[] = [
  'auto',
  'columna',
  'franja',
  'tres-columnas',
  'nucleo-central',
  'barra-lateral',
  'barra-inferior',
  'mosaico',
  'foco',
]
// Paneles que se pueden ordenar, agrandar u ocultar, en el orden por defecto (la prioridad de siempre).
// historico es el bloque Acumulado (entre sesiones); historial, los últimos turnos.
export const LUGARES: readonly HudLugar[] = ['contexto', 'coste', 'comparativa', 'reparto', 'agentes', 'plan', 'historico', 'historial', 'grafica']
export const TAMANOS: readonly HudTamano[] = ['pequeno', 'normal', 'grande']
export const ESCALA_MIN = 0.8
export const ESCALA_MAX = 1.4
// Tamaños de ventana de Edge (--window-size=ancho,alto). completa abre la ventana maximizada.
export const VENTANAS: Readonly<Record<HudVentana, readonly [number, number] | 'max' | null>> = {
  auto: null,
  pequena: [420, 860],
  mediana: [900, 700],
  grande: [1280, 800],
  completa: 'max',
}

export const VISTA_DEFAULT: HudVista = { disposicion: 'auto', orden: [...LUGARES], tamanos: {}, escala: 1, ocultos: [] }

// Minúsculas y sin tildes: "Histórico" vale como historico y "pequeño" como pequeno.
const limpio = (v: unknown): string =>
  String(v)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

const ALIAS: Record<string, HudLugar> = { acumulado: 'historico', turnos: 'historial', ultimos: 'historial' }
const lugar = (v: unknown): HudLugar | undefined => {
  const s = limpio(v)
  return LUGARES.find(x => x === s) ?? ALIAS[s]
}

const texto = (v: unknown): string => (typeof v === 'string' ? JSON.stringify(v) : JSON.stringify(v) ?? String(v))

// Lista de textos; un texto suelto se lee como lista separada por comas.
const comoLista = (v: unknown): unknown[] | null => (Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : null)

function leerLugares(clave: string, v: unknown, avisos: string[]): HudLugar[] | null {
  const l = comoLista(v)
  if (l === null) {
    avisos.push(`${clave} = ${texto(v)} no es una lista de paneles; se ignora`)
    return null
  }
  const out: HudLugar[] = []
  const malos: string[] = []
  for (const x of l) {
    const p = lugar(x)
    if (p !== undefined) {
      if (!out.includes(p)) out.push(p)
    } else if (String(x).trim() !== '') malos.push(String(x).trim())
  }
  if (malos.length > 0) avisos.push(`${clave}: paneles desconocidos ignorados: ${malos.join(', ')} (válidos: ${LUGARES.join(', ')})`)
  return out
}

// Lee y valida la colocación. Un valor que falta toma el defecto sin aviso; uno que no vale toma el defecto y deja
// un aviso (register los escribe en el log al empezar la sesión).
export function leerVista(options: PluginOptions): { vista: HudVista; avisos: string[] } {
  const avisos: string[] = []
  const v: HudVista = { ...VISTA_DEFAULT, orden: [...VISTA_DEFAULT.orden], tamanos: {}, ocultos: [] }

  const d = options['disposicion']
  if (d !== undefined) {
    const ok = DISPOSICIONES.find(x => x === limpio(d))
    if (ok !== undefined) v.disposicion = ok
    else avisos.push(`disposicion = ${texto(d)} no es válida (${DISPOSICIONES.join(', ')}); se usa auto`)
  }

  // orden: los paneles nombrados van primero, en ese orden; los demás detrás, en el orden por defecto.
  const o = options['orden']
  if (o !== undefined) {
    const pedidos = leerLugares('orden', o, avisos)
    if (pedidos !== null) v.orden = [...pedidos, ...LUGARES.filter(p => !pedidos.includes(p))]
  }

  // tamanos: lista de "panel:tamaño" (o "panel=tamaño"), un texto con esas parejas separadas por comas, un objeto
  // {panel: tamaño} (settings.json) o el mismo objeto en JSON.
  const t = options['tamanos']
  if (t !== undefined) {
    let pares: [unknown, unknown][] | null = null
    let obj: unknown = t
    if (typeof t === 'string' && t.trim().startsWith('{')) {
      try {
        obj = JSON.parse(t)
      } catch {
        obj = null
      }
    }
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) pares = Object.entries(obj as Record<string, unknown>)
    else {
      const l = comoLista(obj)
      if (l !== null) {
        pares = l
          .filter(x => String(x).trim() !== '')
          .map(x => {
            const m = /^\s*([^:=]+?)\s*[:=]\s*(.+?)\s*$/.exec(String(x))
            return m ? [m[1], m[2]] : [x, undefined]
          })
      }
    }
    if (pares === null) avisos.push(`tamanos = ${texto(t)} no es una lista de panel:tamaño; todos los paneles van en normal`)
    else {
      const malos: string[] = []
      for (const [k, val] of pares) {
        const p = lugar(k)
        const tam = TAMANOS.find(x => x === limpio(val ?? ''))
        if (p !== undefined && tam !== undefined) v.tamanos[p] = tam
        else malos.push(`${String(k)}${val === undefined ? '' : `:${String(val)}`}`)
      }
      if (malos.length > 0)
        avisos.push(`tamanos: entradas ignoradas: ${malos.join(', ')} (panel:tamaño, con tamaño ${TAMANOS.join(', ')} y panel ${LUGARES.join(', ')})`)
    }
  }

  const e = options['escala']
  if (e !== undefined) {
    const n = typeof e === 'number' ? e : typeof e === 'string' && e.trim() !== '' ? Number(e.trim().replace(',', '.')) : NaN
    if (Number.isFinite(n) && n >= ESCALA_MIN && n <= ESCALA_MAX) v.escala = Math.round(n * 100) / 100
    else avisos.push(`escala = ${texto(e)} está fuera de ${ESCALA_MIN}–${ESCALA_MAX}; se usa ${VISTA_DEFAULT.escala}`)
  }

  const oc = options['ocultos']
  if (oc !== undefined) {
    const l = leerLugares('ocultos', oc, avisos)
    if (l !== null) {
      if (l.length >= LUGARES.length) avisos.push('ocultos esconde todos los paneles; se muestran todos')
      else v.ocultos = LUGARES.filter(p => l.includes(p))
    }
  }

  return { vista: v, avisos }
}

// Opción ventana: tamaño de la ventana de Edge al abrir el HUD. Un valor que no se reconoce usa auto con aviso.
export function leerVentana(options: PluginOptions): { ventana: HudVentana; avisos: string[] } {
  const w = options['ventana']
  if (w === undefined) return { ventana: 'auto', avisos: [] }
  const s = limpio(w)
  const ok = (Object.keys(VENTANAS) as HudVentana[]).find(x => x === s)
  if (ok !== undefined) return { ventana: ok, avisos: [] }
  return {
    ventana: 'auto',
    avisos: [`ventana = ${texto(w)} no es válida (${Object.keys(VENTANAS).join(', ')}); se usa auto`],
  }
}

// Argumentos que se añaden a la línea de Edge (o Chrome) detrás de --app=...
export function argsVentana(v: HudVentana): string[] {
  const t = VENTANAS[v] ?? null
  if (t === null) return []
  if (t === 'max') return ['--start-maximized']
  return [`--window-size=${t[0]},${t[1]}`]
}

// ---------- Colocación en la página ----------
// Se incrustan en el HTML con toString() (ver page.ts), igual que senal.ts y dom.ts: cada función es autónoma (sin
// importar ni usar nada de fuera), sin acentos graves, dólar-llave ni barras invertidas. Los tests las prueban solas.

export type VistaPagina = { disposicion: string; orden: string[]; tamanos: Record<string, string>; escala: number; ocultos: string[] }
export type Puesto = { puesto: number; zona: string; area: string; tam: string; ultimo: boolean }
export type Colocacion = { paneles: Record<string, Puesto>; pocos: boolean; t1: string; nb2: string; nb3: string; resto: number }

// Lo que llega en datos.js como vista, comprobado otra vez (la página no se fía de nada): valores raros, al defecto.
export function normalizaVista(v: unknown): VistaPagina {
  const DISPS = ['auto', 'columna', 'franja', 'tres-columnas', 'nucleo-central', 'barra-lateral', 'barra-inferior', 'mosaico', 'foco']
  const LUG = ['contexto', 'coste', 'comparativa', 'reparto', 'agentes', 'plan', 'historico', 'historial', 'grafica']
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
  const orden: string[] = []
  const pedido = Array.isArray(o['orden']) ? (o['orden'] as unknown[]) : []
  for (let i = 0; i < pedido.length; i++) {
    const p = String(pedido[i])
    if (LUG.indexOf(p) >= 0 && orden.indexOf(p) < 0) orden.push(p)
  }
  for (let i = 0; i < LUG.length; i++) if (orden.indexOf(LUG[i] as string) < 0) orden.push(LUG[i] as string)
  const tamanos: Record<string, string> = {}
  const t = o['tamanos'] && typeof o['tamanos'] === 'object' ? (o['tamanos'] as Record<string, unknown>) : {}
  for (let i = 0; i < LUG.length; i++) {
    const x = t[LUG[i] as string]
    if (x === 'pequeno' || x === 'grande') tamanos[LUG[i] as string] = x
  }
  const ocultos: string[] = []
  const oc = Array.isArray(o['ocultos']) ? (o['ocultos'] as unknown[]) : []
  for (let i = 0; i < oc.length; i++) if (LUG.indexOf(String(oc[i])) >= 0 && ocultos.indexOf(String(oc[i])) < 0) ocultos.push(String(oc[i]))
  if (ocultos.length >= LUG.length) ocultos.length = 0
  const es = Number(o['escala'])
  const d = String(o['disposicion'])
  return { disposicion: DISPS.indexOf(d) >= 0 ? d : 'auto', orden, tamanos, escala: es >= 0.8 && es <= 1.4 ? es : 1, ocultos }
}

// Puestos: los paneles a la vista, en el orden pedido. fuera dice cuáles no se ven por otros motivos (opción paneles,
// acumulado sin histórico, últimos turnos en compacto). Devuelve, por panel: puesto (1-9; 0 si no se ve), zona (a: los
// puestos destacados de la disposición; b: el resto), área con nombre (solo en auto con todos a la vista, o en los
// puestos destacados de nucleo-central, barra-lateral y foco), tamaño y si es el último de la zona b. Y, para <html>:
// pocos (menos paneles que puestos destacados: todo a la rejilla que se rellena sola), t1 (tamaño del primer puesto),
// nb2 / nb3 (paneles b que sobran de dos en dos o de tres en tres, si todos van en normal; si no, "x") y resto (cuántos b).
export function colocar(v: VistaPagina, fuera: Record<string, boolean>): Colocacion {
  const LUG = ['contexto', 'coste', 'comparativa', 'reparto', 'agentes', 'plan', 'historico', 'historial', 'grafica']
  const AREAS = ['ctx', 'cost', 'comp', 'mod', 'agt', 'plan', 'acum', 'hist', 'chart']
  const DESTACADOS: Record<string, number> = { franja: 3, 'nucleo-central': 5, 'barra-lateral': 3, 'barra-inferior': 3, foco: 2 }
  const CON_AREA: Record<string, number> = { 'nucleo-central': 1, 'barra-lateral': 1, foco: 1 }
  const tam = (p: string) => (v.tamanos[p] === 'pequeno' || v.tamanos[p] === 'grande' ? (v.tamanos[p] as string) : 'normal')
  const vis = v.orden.filter(p => LUG.indexOf(p) >= 0 && !fuera[p] && v.ocultos.indexOf(p) < 0)
  // auto: las áreas de siempre, sin las de los paneles que no se ven por la página (no por el usuario).
  const areas = AREAS.filter((_, i) => !fuera[LUG[i] as string] || v.ocultos.indexOf(LUG[i] as string) >= 0)
  const todosAuto = vis.length === areas.length
  const n = DESTACADOS[v.disposicion] || 0
  const pocos = n > 0 && vis.length < n
  const bs = vis.filter((_, i) => pocos || i >= n)
  const normales = bs.every(p => tam(p) === 'normal')
  const paneles: Record<string, Puesto> = {}
  for (let k = 0; k < LUG.length; k++) {
    const p = LUG[k] as string
    const i = vis.indexOf(p)
    const zona = i >= 0 && !pocos && i < n ? 'a' : 'b'
    let area = ''
    if (i >= 0 && v.disposicion === 'auto' && todosAuto) area = areas[i] as string
    else if (i >= 0 && zona === 'a' && CON_AREA[v.disposicion]) area = AREAS[i] as string
    paneles[p] = { puesto: i + 1, zona, area, tam: tam(p), ultimo: bs.length > 0 && bs[bs.length - 1] === p }
  }
  return {
    paneles,
    pocos,
    t1: vis.length ? tam(vis[0] as string) : 'normal',
    nb2: normales ? String(bs.length % 2) : 'x',
    nb3: normales ? String(bs.length % 3) : 'x',
    resto: Math.max(0, vis.length - n),
  }
}

// Pone la colocación en el DOM, solo con atributos (ponAttr de dom.ts escribe solo lo que cambia). els: panel por nombre.
export function ponPuestos(
  els: Record<string, { getAttribute(k: string): string | null; setAttribute(k: string, v: string): void }>,
  root: { getAttribute(k: string): string | null; setAttribute(k: string, v: string): void },
  r: Colocacion,
  ponAttr: (el: never, k: string, v: unknown) => boolean,
): number {
  let w = 0
  const pon = (el: unknown, k: string, v: unknown) => {
    if (ponAttr(el as never, k, v)) w++
  }
  for (const p in r.paneles) {
    const x = r.paneles[p] as Puesto
    const el = els[p]
    if (!el) continue
    pon(el, 'data-puesto', String(x.puesto))
    pon(el, 'data-zona', x.zona)
    pon(el, 'data-area', x.area)
    pon(el, 'data-tam', x.tam)
    pon(el, 'data-ultimo', x.ultimo ? '1' : '0')
  }
  pon(root, 'data-pocos', r.pocos ? '1' : '0')
  pon(root, 'data-t1', r.t1)
  pon(root, 'data-nb2', r.nb2)
  pon(root, 'data-nb3', r.nb3)
  return w
}

// El bloque que se pega en la página.
export const COLOCAR_JS = [
  'var normalizaVista=(' + String(normalizaVista) + ');',
  'var colocar=(' + String(colocar) + ');',
  'var ponPuestos=(' + String(ponPuestos) + ');',
].join('\n')

// ---------- CSS de las disposiciones ----------
// Una rejilla de 24 columnas para todas las disposiciones salvo auto: así un panel puede ocupar 1/4, 1/3, 1/2, 2/3 o
// todo el ancho. Cada disposición es un bloque html[data-disposicion="..."] con su grid-template-areas. El script de la
// página solo pone atributos: data-puesto (1-9, el sitio del panel en el orden visible; CSS order), data-zona (a: los
// puestos destacados de la disposición; b: el resto), data-area (el área con nombre del puesto destacado), data-tam
// (pequeno, normal o grande) y, en <html>, data-t1 (tamaño del primer puesto), data-pocos (menos paneles que puestos
// destacados) y data-foco (lista plegable de foco). El orden del DOM no cambia nunca.
// Las áreas con nombre son puestos: ctx es el puesto 1, cost el 2, comp el 3, mod el 4 y agt el 5 (los nombres
// de los paneles que los ocupan con el orden por defecto). Con otro orden, el panel del puesto N ocupa el área N.
// El tamaño se lee de --sp (columnas que ocupa): --sa-p/n/g para la zona a y --sb-p/n/g para la b, por disposición y
// ancho de ventana. Por debajo de 560 px todas van en una columna. Nada de esto lleva acentos graves, dólar-llave ni
// barras invertidas: se pega dentro del template literal de page.ts.

export const AREAS = ['ctx', 'cost', 'comp', 'mod', 'agt', 'plan', 'acum', 'hist', 'chart'] as const
const COLS = 24
const D = ':where(html[data-disposicion]:not([data-disposicion="auto"]))'
const L = (d: HudDisposicion) => `html[data-disposicion="${d}"]`

// Una fila de grid-template-areas: [nombre, columnas]..., que suman 24.
export function fila(...partes: [string, number][]): string {
  const n = partes.reduce((a, [, k]) => a + k, 0)
  if (n !== COLS) throw new Error(`fila de ${n} columnas`)
  return '"' + partes.flatMap(([nombre, k]) => Array<string>(k).fill(nombre)).join(' ') + '"'
}
// Plantilla con la cabecera arriba. El espacio tras los dos puntos es a propósito (las plantillas de auto van sin él).
const plantilla = (...filas: string[]) => `grid-template-areas: ${[fila(['head', COLS]), ...filas].join(' ')}!important`
const spans = (a: [number, number, number] | null, b: [number, number, number] | null) =>
  [
    a ? `--sa-p:${a[0]};--sa-n:${a[1]};--sa-g:${a[2]}` : '',
    b ? `--sb-p:${b[0]};--sb-n:${b[1]};--sb-g:${b[2]}` : '',
  ]
    .filter(Boolean)
    .join(';')
// Área con nombre para cada puesto destacado que tiene una (solo dentro de la media query de su plantilla).
const areas = (d: HudDisposicion, n: number) =>
  AREAS.slice(0, n)
    .map(a => `${L(d)}:not([data-pocos="1"]) .pnl[data-area="${a}"]{grid-area:${a}!important}`)
    .join('\n')
const q = (media: string, reglas: string[]) => `@media ${media}{\n${reglas.join('\n')}\n}`
// Primer puesto a todo el ancho entre 560 y 899 px (franja, núcleo, barras), salvo que sea pequeño.
const primeroAncho = (d: HudDisposicion) => `${L(d)} .pnl[data-zona="a"][data-puesto="1"]:not([data-tam="pequeno"]){--sp:24}`
const ESTRECHA = '(min-width:560px) and (max-width:899px)'

// Barra lateral: K columnas para la barra y la zona b en dos mitades de lo que queda.
const lateral = (k: number, b: [number, number, number] = [k, (COLS - k) / 2, COLS]) =>
  `${L('barra-lateral')}:not([data-pocos="1"]) .wrap{${plantilla(fila(['ctx', k], ['.', COLS - k]), fila(['cost', k], ['.', COLS - k]), fila(['comp', k], ['.', COLS - k]))};${spans(null, b)}}`
// Núcleo central: el puesto 1 en el centro (c columnas) y los puestos 2-5 a los lados.
const nucleo = (c: number) => {
  const l = (COLS - c) / 2
  return `${L('nucleo-central')}:not([data-pocos="1"]) .wrap{${plantilla(fila(['cost', l], ['ctx', c], ['mod', l]), fila(['comp', l], ['ctx', c], ['agt', l]))}}`
}
const foco = (a: number) => `${L('foco')}:not([data-pocos="1"]) .wrap{${plantilla(fila(['ctx', a], ['cost', COLS - a]), fila(['mas', COLS]))}}`

// Cierre de la última fila: con todos los paneles de la zona b en normal, el último ocupa lo que sobra de su fila
// (data-nb2 y data-nb3 en <html>: cuántos paneles b sobran al repartirlos de dos en dos o de tres en tres).
const cierre = (d: HudDisposicion, tipo: 'mitades' | 'tercios') =>
  tipo === 'mitades'
    ? `${L(d)}[data-nb2="1"] .pnl[data-ultimo="1"]{--sp:24}`
    : `${L(d)}[data-nb3="1"] .pnl[data-ultimo="1"]{--sp:24}${L(d)}[data-nb3="2"] .pnl[data-ultimo="1"]{--sp:16}`

export const DISPOSICION_CSS = [
  '/* ===== Disposiciones (opción disposicion; atributo data-disposicion en <html>) =====',
  '   auto: la de siempre, por tamaño de ventana (las reglas de arriba). Las demás, en una rejilla de 24 columnas:',
  '   columna, franja, tres-columnas, nucleo-central, barra-lateral, barra-inferior, mosaico y foco (detalle en disposicion.ts).',
  '   Orden (opción orden): CSS order por data-puesto; el DOM no cambia. Tamaños (opción tamanos): --sp por data-tam.',
  '   Paneles ocultos (opción ocultos, clase lg-off) no cuentan: los puestos se renumeran y la rejilla no deja huecos. */',
  [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `.pnl[data-puesto="${n}"]{order:${n}}`).join(''),
  '.wrap>header{order:-1}.wrap>footer{order:99}',
  '.pnl.lg-off{display:none!important}',
  // auto: con todos los paneles a la vista, el panel del puesto N ocupa el área del puesto N (el orden cambia de sitio).
  AREAS.map(a => `html[data-disposicion="auto"] body:not(.pn-sel) .pnl[data-area="${a}"]{grid-area:${a}!important}`).join('\n'),
  'body.pn-sel .pnl[data-tam="grande"]{grid-column:1/-1}',
  // Base de las disposiciones con nombre (especificidad 0 con :where, así cada disposición la cambia sin pelear).
  `${D} .wrap{grid-template-columns:repeat(${COLS},minmax(0,1fr))!important;grid-template-rows:none!important;${plantilla()};grid-auto-flow:row dense;height:auto!important;align-content:start}`,
  // Cabecera y pie a todo el ancho (con más peso que las reglas de la opción paneles de auto).
  'html[data-disposicion]:not([data-disposicion="auto"]) .wrap>header{grid-area:head!important}',
  'html[data-disposicion]:not([data-disposicion="auto"]) .wrap>footer{grid-area:auto!important;grid-column:1/-1!important}',
  `${D} .pnl{grid-area:auto!important;--sp:var(--sb-n,24);grid-column:span var(--sp)!important}`,
  `${D} .pnl[data-tam="pequeno"]{--sp:var(--sb-p,24)}`,
  `${D} .pnl[data-tam="grande"]{--sp:var(--sb-g,24)}`,
  `${D} .pnl[data-zona="a"]{--sp:var(--sa-n,24)}`,
  `${D} .pnl[data-zona="a"][data-tam="pequeno"]{--sp:var(--sa-p,24)}`,
  `${D} .pnl[data-zona="a"][data-tam="grande"]{--sp:var(--sa-g,24)}`,
  // Dentro de los paneles: el acumulado y las cifras del contexto arriba, sin estirarse; el contexto en vertical si su
  // panel es estrecho (con el núcleo al lado, las etiquetas pisaban las cifras).
  `${D} .acb,${D} .kv{align-content:start}`,
  `@container (max-width:479px){${D} .ctxb{flex-direction:column!important;align-items:center!important}${D} .ctxb>.reactor{width:min(240px,72cqi)!important;max-width:none!important}${D} .ctxb>.kv{flex:none;width:100%}}`,
  // Un contexto grande lleva un globo más grande (si no, se quedaba pequeño en medio de una baldosa doble).
  `${D} .pnl[data-tam="grande"] .reactor{width:clamp(170px,min(56cqi,40vh),520px)!important;max-width:none!important}`,
  // Reparto por modelo en un panel de ancho medio con letra grande: las columnas fijas no caben, se reparten.
  `@container (min-width:460px){${D} .cmp{grid-template-columns:minmax(0,15em) minmax(4em,1fr) auto auto}}`,
  // Botón de la lista plegable de foco: solo en foco y si hay paneles que plegar.
  '.focomas{display:none}',
  `${L('foco')}:has(.pnl[data-zona="b"]:not(.pn-off):not(.lg-off):not(.ac-off)) .focomas{display:flex;grid-column:1/-1;order:2}`,
  `${L('foco')}:not([data-foco="abierto"]) .pnl[data-zona="b"]{display:none!important}`,
  '.focomas{align-items:center;justify-content:flex-start;gap:12px;width:100%;min-width:0;cursor:pointer;font:inherit;font-size:var(--fv);color:var(--txt);background:var(--panel);border:1px solid var(--borde,var(--edge));border-radius:10px;padding:calc(var(--pad)*.7) var(--pad);text-align:left}',
  '.focomas:hover{border-color:var(--borde-2,var(--edge-on))}',
  '.focomas .num{color:var(--sub);font-size:var(--fk)}',
  '.focomas:after{content:"+";margin-left:auto;color:var(--sub);font-size:var(--fv)}',
  'html[data-foco="abierto"] .focomas:after{content:"-"}',

  // columna: todo en una columna (pequeno: media columna, grande: más alto).
  `${L('columna')} .wrap{${plantilla()};max-width:max(1120px,50vw)}`,
  q('(min-width:560px)', [`${L('columna')} .wrap{${spans(null, [12, 24, 24])}}`]),
  `${L('columna')} .pnl[data-tam="grande"]{min-height:min(72vh,760px)}`,

  // franja: resumen arriba (puestos 1-3 en una fila) y el detalle debajo.
  `${L('franja')} .wrap{${plantilla()}}`,
  q(ESTRECHA, [`${L('franja')} .wrap{${spans([12, 12, 24], [12, 24, 24])}}`, primeroAncho('franja')]),
  q('(min-width:900px) and (max-width:1599px)', [`${L('franja')} .wrap{${spans([6, 8, 12], [8, 12, 24])}}`, cierre('franja', 'mitades')]),
  q('(min-width:1600px)', [`${L('franja')} .wrap{${spans([6, 8, 12], [6, 8, 16])}}`, cierre('franja', 'tercios')]),

  // tres-columnas: tres columnas iguales (dos entre 900 y 1199 px, una por debajo de 560).
  `${L('tres-columnas')} .wrap{${plantilla()}}`,
  q('(min-width:560px) and (max-width:1199px)', [`${L('tres-columnas')} .wrap{${spans(null, [12, 12, 24])}}`, cierre('tres-columnas', 'mitades')]),
  q('(min-width:900px) and (max-width:1199px)', [`${L('tres-columnas')} .wrap{${spans(null, [8, 12, 24])}}`]),
  q('(min-width:1200px)', [`${L('tres-columnas')} .wrap{${spans(null, [6, 8, 16])}}`, cierre('tres-columnas', 'tercios')]),

  // nucleo-central: el globo (puesto 1) al centro y los puestos 2-5 a los lados; el resto debajo, en dos mitades.
  q(ESTRECHA, [`${L('nucleo-central')} .wrap{${spans([12, 12, 24], [12, 24, 24])}}`, primeroAncho('nucleo-central')]),
  q('(min-width:900px)', [nucleo(8), `${L('nucleo-central')} .wrap{${spans(null, [8, 12, 24])}}`, cierre('nucleo-central', 'mitades'), areas('nucleo-central', 5)]),
  q('(min-width:1200px)', [nucleo(12), `${L('nucleo-central')}[data-t1="pequeno"]:not([data-pocos="1"]) .wrap{${plantilla(fila(['cost', 8], ['ctx', 8], ['mod', 8]), fila(['comp', 8], ['ctx', 8], ['agt', 8]))}}`]),
  q('(min-width:1600px)', [`${L('nucleo-central')}[data-t1="grande"]:not([data-pocos="1"]) .wrap{${plantilla(fila(['cost', 5], ['ctx', 14], ['mod', 5]), fila(['comp', 5], ['ctx', 14], ['agt', 5]))}}`]),
  `${L('nucleo-central')}:not([data-pocos="1"]) .pnl[data-area="ctx"] .ctxb{flex-direction:column;justify-content:center}`,
  `${L('nucleo-central')}:not([data-pocos="1"]) .pnl[data-area="ctx"] .ctxb>.kv{flex:none;width:100%}`,
  `${L('nucleo-central')}:not([data-pocos="1"]) .pnl[data-area="ctx"] .reactor{width:clamp(170px,min(70cqi,40vh),560px)!important;max-width:none!important}`,

  // barra-lateral: columna estrecha a la izquierda con los puestos 1-3 (el contexto arriba) y el resto a la derecha.
  q(ESTRECHA, [`${L('barra-lateral')} .wrap{${spans([12, 24, 24], [12, 24, 24])}}`]),
  // 900-1199 px: barra de 10 columnas; los tres primeros paneles de la zona b a su lado y el resto a todo el ancho.
  q('(min-width:900px)', [lateral(10, [10, 14, 24]), areas('barra-lateral', 3)]),
  q('(min-width:900px) and (max-width:1199px)', [`${L('barra-lateral')}:not([data-pocos="1"]) .pnl[data-zona="b"]:is([data-puesto="7"],[data-puesto="8"],[data-puesto="9"]):not([data-tam="pequeno"]){--sp:24}`]),
  q('(min-width:1200px)', [lateral(6), cierre('barra-lateral', 'mitades'), `${L('barra-lateral')}[data-t1="grande"]:not([data-pocos="1"]) .wrap{${lateral(8).split('{')[1]}`]),
  q('(min-width:1600px)', [`${L('barra-lateral')}[data-t1="pequeno"]:not([data-pocos="1"]) .wrap{${lateral(4).split('{')[1]}`]),

  // barra-inferior: el resumen (puestos 1-3) en una fila al pie que se queda fija al desplazar.
  `${L('barra-inferior')} .wrap{${plantilla()}}`,
  `${L('barra-inferior')} .pnl[data-zona="a"][data-puesto="1"]{order:91}${L('barra-inferior')} .pnl[data-zona="a"][data-puesto="2"]{order:92}${L('barra-inferior')} .pnl[data-zona="a"][data-puesto="3"]{order:93}`,
  `${L('barra-inferior')} .wrap>footer{order:89}`,
  q(ESTRECHA, [`${L('barra-inferior')} .wrap{${spans([12, 12, 24], [12, 24, 24])}}`, primeroAncho('barra-inferior')]),
  q('(min-width:900px) and (max-width:1599px)', [`${L('barra-inferior')} .wrap{${spans([6, 8, 12], [8, 12, 24])}}`, cierre('barra-inferior', 'mitades')]),
  q('(min-width:1600px)', [`${L('barra-inferior')} .wrap{${spans([6, 8, 12], [6, 8, 16])}}`, cierre('barra-inferior', 'tercios')]),
  // Fija solo si cabe en una fila (sin grande) y la ventana tiene alto para ella.
  q('(min-width:900px) and (min-height:700px)', [
    `${L('barra-inferior')}:not(:has(.pnl[data-zona="a"][data-tam="grande"])) .pnl[data-zona="a"]{position:sticky;bottom:var(--gap);z-index:6;--glass:var(--panel);--glass2:var(--panel);box-shadow:0 0 0 var(--gap) var(--bg)!important}`,
    `${L('barra-inferior')} .pnl[data-zona="a"] .ctxb{flex-direction:row;justify-content:flex-start}`,
    `${L('barra-inferior')} .pnl[data-zona="a"] .ctxb>.kv{flex:1;min-width:0}`,
    `${L('barra-inferior')} .pnl[data-zona="a"] .reactor{width:clamp(96px,min(34cqi,17vh),180px)!important;max-width:none!important}`,
  ]),

  // mosaico: baldosas iguales (dos filas de --fila); pequeno: media baldosa, grande: el doble de ancho y de alto.
  // Las filas son de alto automático y cada baldosa pide un alto mínimo: así la cabecera y el pie no crecen y ningún
  // texto se corta (si un panel necesita más, su fila crece).
  `${L('mosaico')} .wrap{${plantilla()};--fila:clamp(130px,19vh,300px)}`,
  q('(min-width:560px)', [
    `${L('mosaico')} .wrap{${spans(null, [12, 12, 24])}}`,
    `${L('mosaico')} .pnl{grid-row:span 2!important;min-height:calc(var(--fila)*2 + var(--gap))}`,
    `${L('mosaico')} .pnl[data-tam="pequeno"]{grid-row:span 1!important;min-height:var(--fila)}`,
    `${L('mosaico')} .pnl[data-tam="grande"]{grid-row:span 4!important;min-height:calc(var(--fila)*4 + var(--gap)*3)}`,
  ]),
  q('(min-width:560px) and (max-width:1199px)', [cierre('mosaico', 'mitades')]),
  q('(min-width:1200px)', [`${L('mosaico')} .wrap{${spans(null, [8, 8, 16])}}`, cierre('mosaico', 'tercios')]),

  // foco: contexto y coste (puestos 1 y 2) grandes; el resto en una lista plegable debajo.
  q('(min-width:900px)', [
    foco(12),
    `${L('foco')}[data-t1="grande"]:not([data-pocos="1"]) .wrap{${foco(16).split('{')[1]}`,
    `${L('foco')}[data-t1="pequeno"]:not([data-pocos="1"]) .wrap{${foco(8).split('{')[1]}`,
    areas('foco', 2),
    `${L('foco')}:not([data-pocos="1"]) .focomas{grid-area:mas!important}`,
    `${L('foco')} .wrap{${spans(null, [12, 24, 24])}}`,
  ]),
  `${L('foco')} .pnl[data-zona="a"] .reactor{width:clamp(180px,min(64cqi,46vh),620px)!important;max-width:none!important}`,
  `${L('foco')} .pnl[data-zona="a"] .ctxb{flex-direction:column;justify-content:center}`,
  `${L('foco')} .pnl[data-zona="a"] .ctxb>.kv{flex:none;width:100%}`,
  `${L('foco')} .pnl[data-zona="a"] .cost{font-size:clamp(40px,17cqi,calc(140px*var(--escala,1)))}`,
  `${L('foco')} .pnl[data-tam="grande"][data-zona="b"]{min-height:min(72vh,760px)}`,
].join('\n')
