// Actualización del DOM de la página por diferencias: se pinta una vez y después solo se tocan
// los textos, atributos y estilos que cambian. Nada de reconstruir paneles con innerHTML.
// Se incrusta en el HTML con toString() (ver page.ts), igual que senal.ts: cada función es
// autónoma (sin importar ni llamar a otras funciones de aquí), sin acentos graves, dólar-llave
// ni barras invertidas. Los tests las prueban con un DOM falso mínimo.

export type Estilo = { getPropertyValue(p: string): string; setProperty(p: string, v: string): void }
export type Nodo = {
  textContent: string | null
  getAttribute(k: string): string | null
  setAttribute(k: string, v: string): void
  style: Estilo
}
export type Caja = Nodo & {
  children: ArrayLike<Nodo>
  insertBefore(n: Nodo, ref: Nodo | null): unknown
  removeChild(n: Nodo): unknown
}

// Texto de un nodo (o nodo de texto): solo se escribe si cambia. Devuelve si escribió.
export function ponTexto(el: { textContent: string | null }, v: unknown): boolean {
  const s = String(v)
  if (el.textContent === s) return false
  el.textContent = s
  return true
}

// Atributo: solo se escribe si cambia (también "class": así no se reinician las animaciones).
export function ponAttr(el: Nodo, k: string, v: unknown): boolean {
  const s = String(v)
  if (el.getAttribute(k) === s) return false
  el.setAttribute(k, s)
  return true
}

// Propiedad de estilo (también variables --x): se compara con el último valor puesto, no con el
// que devuelve el navegador, que lo normaliza ("42.0%" pasa a "42%").
export function ponEstilo(el: Nodo, p: string, v: unknown): boolean {
  const s = String(v)
  const o = el as Nodo & { __estilo?: Record<string, string> }
  const memo = o.__estilo || (o.__estilo = {})
  if (memo[p] === s) return false
  memo[p] = s
  el.style.setProperty(p, s)
  return true
}

// Barra segmentada ya creada (un div con count elementos i): enciende los que tocan según p (0-100)
// y les pone el degradado --k. Solo toca los segmentos que cambian. Devuelve cuántos escribió.
export function ponSegs(seg: Caja, p: number): number {
  const ks = seg.children
  const count = ks.length
  const v = Math.max(0, Math.min(100, Number(p) || 0))
  let on = Math.round((v * count) / 100)
  if (v > 0 && on === 0) on = 1
  let w = 0
  for (let i = 0; i < count; i++) {
    const el = ks[i] as Nodo & { __estilo?: Record<string, string> }
    const cls = i < on ? 'on' : ''
    const k = i < on ? (on > 1 ? (i / (on - 1)).toFixed(2) : '1') : ''
    if (el.getAttribute('class') !== cls) {
      el.setAttribute('class', cls)
      w++
    }
    const memo = el.__estilo || (el.__estilo = {})
    if ((memo['--k'] || '') !== k) {
      memo['--k'] = k
      el.style.setProperty('--k', k)
      w++
    }
  }
  return w
}

// Lista con clave: reutiliza los hijos que ya existen (misma clave), crea solo los nuevos, quita
// los que sobran y deja el orden de items. poner(el, item, i, nuevo) actualiza cada uno con las
// funciones de arriba. Un hijo sin clave (el contenido inicial del HTML) se quita la primera vez.
export function lista<T>(
  box: Caja,
  items: readonly T[],
  clave: (x: T, i: number) => string,
  crear: (x: T, i: number) => Nodo,
  poner: (el: Nodo, x: T, i: number, nuevo: boolean) => void,
): { creados: number; quitados: number; movidos: number } {
  type ConClave = Nodo & { __clave?: string }
  const keys: string[] = []
  const usadas: Record<string, number> = {}
  for (let i = 0; i < items.length; i++) {
    const base = 'k:' + clave(items[i] as T, i)
    const n = usadas[base] || 0
    usadas[base] = n + 1
    keys.push(n ? base + '#' + n : base)
  }
  const quiero: Record<string, number> = {}
  for (let i = 0; i < keys.length; i++) quiero[keys[i] as string] = 1
  const viejos: Record<string, ConClave> = {}
  const fuera: ConClave[] = []
  for (let i = 0; i < box.children.length; i++) {
    const el = box.children[i] as ConClave
    if (el.__clave !== undefined && quiero[el.__clave] && !viejos[el.__clave]) viejos[el.__clave] = el
    else fuera.push(el)
  }
  // Primero se quita lo que sobra: así los que se quedan no se mueven (moverlos reinicia sus animaciones).
  for (let i = 0; i < fuera.length; i++) box.removeChild(fuera[i] as Nodo)
  let creados = 0
  let movidos = 0
  for (let i = 0; i < items.length; i++) {
    const k = keys[i] as string
    const x = items[i] as T
    let el = viejos[k]
    const nuevo = !el
    if (!el) {
      el = crear(x, i) as ConClave
      el.__clave = k
      creados++
    }
    poner(el, x, i, nuevo)
    const ref = i < box.children.length ? (box.children[i] as Nodo) : null
    if (ref !== el) {
      box.insertBefore(el, ref)
      if (!nuevo) movidos++
    }
  }
  return { creados, quitados: fuera.length, movidos }
}

// Firma de los datos sin el latido: si no cambia, no hay nada que repintar.
export function firma(d: unknown): string {
  if (!d || typeof d !== 'object') return ''
  const o: Record<string, unknown> = {}
  const src = d as Record<string, unknown>
  for (const k of Object.keys(src)) if (k !== 'latido') o[k] = src[k]
  return JSON.stringify(o)
}

// El bloque que se pega en la página.
export const DOM = [
  'var ponTexto=(' + String(ponTexto) + ');',
  'var ponAttr=(' + String(ponAttr) + ');',
  'var ponEstilo=(' + String(ponEstilo) + ');',
  'var ponSegs=(' + String(ponSegs) + ');',
  'var lista=(' + String(lista) + ');',
  'var firma=(' + String(firma) + ');',
].join('\n')
