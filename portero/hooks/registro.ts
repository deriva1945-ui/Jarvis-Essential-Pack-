// Registro local de decisiones (JSON lines) y su resumen para /portero. Funciones puras.

import type { Capa, Ruta } from './reglas'

export type Entrada = {
  ts: string
  ruta: Ruta
  capa: Capa
  motivo: string
  texto: string
  longitud: number
  aviso?: string
}

export const ARCHIVO = 'decisiones.jsonl'

const RUTAS: readonly Ruta[] = ['ligera', 'pesada', 'dudosa']

const esEntrada = (v: unknown): v is Entrada => {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return typeof o['ts'] === 'string' && RUTAS.includes(o['ruta'] as Ruta) && typeof o['motivo'] === 'string'
}

// Lee el contenido del archivo; ignora las líneas rotas.
export function parsear(texto: string): Entrada[] {
  const out: Entrada[] = []
  for (const line of texto.split(/\r?\n/)) {
    if (!line.trim()) continue
    try {
      const v: unknown = JSON.parse(line)
      if (esEntrada(v)) out.push(v)
    } catch {
      // línea incompleta: se salta
    }
  }
  return out
}

export const serializar = (entradas: readonly Entrada[]): string =>
  entradas.map(e => JSON.stringify(e)).join('\n') + (entradas.length ? '\n' : '')

// Añade una entrada y deja solo las últimas "max".
export const anadir = (entradas: readonly Entrada[], e: Entrada, max: number): Entrada[] =>
  [...entradas, e].slice(-Math.max(1, max))

const pct = (n: number, total: number) => (total ? `${Math.round((n * 100) / total)}%` : '0%')

const contar = <K extends string>(xs: readonly K[]): Array<[K, number]> => {
  const m = new Map<K, number>()
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

// Texto de /portero: reparto de rutas, capas, reglas que más disparan, avisos y últimos casos.
export function resumen(entradas: readonly Entrada[], carpeta: string, ultimos = 8, top = 6): string {
  const total = entradas.length
  if (total === 0) {
    return `portero: aún no hay decisiones registradas.\nRegistro: ${carpeta}\nUsa /portero reglas para ver las reglas activas.`
  }
  const lines: string[] = [`portero · ${total} decisiones registradas`, '', 'Reparto de rutas:']
  for (const r of RUTAS) {
    const n = entradas.filter(e => e.ruta === r).length
    lines.push(`  ${r.padEnd(7)} ${String(n).padStart(5)}  ${pct(n, total).padStart(4)}`)
  }
  lines.push('', 'Por capa:')
  for (const [c, n] of contar(entradas.map(e => e.capa))) lines.push(`  ${c.padEnd(10)} ${String(n).padStart(5)}  ${pct(n, total).padStart(4)}`)
  lines.push('', 'Reglas que más disparan:')
  for (const [m, n] of contar(entradas.map(e => e.motivo)).slice(0, top)) lines.push(`  ${String(n).padStart(5)}  ${m}`)
  const avisos = entradas.filter(e => e.aviso)
  if (avisos.length) {
    lines.push('', `Avisos: ${avisos.length} (el clasificador falló y se eligió pesada). Último: ${avisos.at(-1)!.aviso}`)
  }
  lines.push('', 'Últimos casos:')
  for (const e of entradas.slice(-ultimos).reverse()) {
    const hora = e.ts.replace('T', ' ').slice(0, 19)
    lines.push(`  ${hora}  ${e.ruta.padEnd(6)}  ${e.motivo}  · ${e.texto || '(sin texto)'}`)
  }
  lines.push('', `Registro: ${carpeta}`)
  return lines.join('\n')
}
