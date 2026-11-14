// Rutas del registro. La carpeta sale de la opción dataDir (userConfig de plugin.json);
// aquí solo hay funciones puras, sin acceso al disco ni al entorno.

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
