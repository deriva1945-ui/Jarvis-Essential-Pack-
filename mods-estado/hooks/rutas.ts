// Rutas del mod. La carpeta del pack sale de la opción modsDir (userConfig de plugin.json);
// aquí solo hay funciones puras, sin acceso al disco ni al entorno.

// Valor por defecto de modsDir: "~" es la carpeta del usuario en cualquier sistema.
export const MODS_DIR_DEFAULT = '~/CLAUDE/mods'

// Separador que ya usa la carpeta: "\" si la ruta lo lleva, "/" en otro caso.
const sepOf = (dir: string) => (dir.includes('\\') ? '\\' : '/')

const sinBarraFinal = (dir: string) => (/^[\\/]+$/.test(dir) ? dir : dir.replace(/[\\/]+$/, ''))

// Ruta absoluta: "/x", "\x", "C:\x" o "C:/x".
export const esAbsoluta = (p: string) => /^([A-Za-z]:[\\/]|[\\/])/.test(p)

// Sustituye un "~" inicial por la carpeta del usuario; una ruta relativa cuenta desde ella.
// Devuelve null si la opción está vacía o si hace falta la carpeta del usuario y no se conoce.
export function expandir(dir: string, home: string | undefined): string | null {
  const t = dir.trim()
  if (t === '') return null
  if (esAbsoluta(t)) return t
  const d = t === '~' || t.startsWith('~/') || t.startsWith('~\\') ? t : `~/${t}`
  const h = (home ?? '').trim()
  if (h === '') return null
  const base = sinBarraFinal(h)
  const rest = d.slice(1)
  return base.includes('\\') ? base + rest.replace(/\//g, '\\') : base + rest.replace(/\\/g, '/')
}

// Une una carpeta y un nombre de archivo con el separador de la carpeta.
export const unir = (dir: string, name: string) => {
  const base = sinBarraFinal(dir)
  return /[\\/]$/.test(base) ? base + name : base + sepOf(base) + name
}

// Ruta de Windows: con letra de unidad ("C:\x", "C:/x") o con "\".
export const esRutaWindows = (p: string) => /^[A-Za-z]:[\\/]/.test(p) || p.includes('\\')

// Carpeta que contiene a "dir" (sin la última parte). La raíz se queda como está.
export const padre = (dir: string) => {
  const base = sinBarraFinal(dir)
  const cut = Math.max(base.lastIndexOf('/'), base.lastIndexOf('\\'))
  if (cut < 0) return base
  const head = base.slice(0, cut)
  // "C:\x" → "C:\", "/x" → "/"
  if (head === '' || /^[A-Za-z]:$/.test(head)) return base.slice(0, cut + 1)
  return head
}
