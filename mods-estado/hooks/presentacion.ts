// Presentación monocroma de /mods, con la estética del HUD de consumo: blanco, grises y negro,
// sin color de acento. Solo decide el tono de cada trozo de texto; el texto no cambia.

// Paleta del pack. El rojo apagado queda para una alerta crítica; /mods no tiene ninguna.
export const TONO = {
  blanco: '#ffffff',
  claro: '#d4d4d4',
  gris: '#a3a3a3',
  oscuro: '#737373',
  alerta: '#b85c5c',
} as const

export type Tono = keyof typeof TONO

export type Tramo = { texto: string; tono: Tono; negrita?: boolean }

// Carácter de las líneas separadoras (bajo el encabezado de la tabla).
export const SEPARADOR = '─'

const MARCA: Record<string, Omit<Tramo, 'texto'>> = {
  '[x]': { tono: 'blanco' },
  '[ ]': { tono: 'blanco' },
  '[!]': { tono: 'blanco', negrita: true },
  '[?]': { tono: 'gris' },
}

const esSeparador = (l: string) => /^\s*─+\s*$/.test(l)

// Reparte cada línea de la salida de /mods en tramos con su tono.
export function lineasMonocromas(texto: string): Tramo[][] {
  const lineas = texto.split('\n')
  return lineas.map((l, i): Tramo[] => {
    if (l.trim() === '') return []
    if (esSeparador(l)) return [{ texto: l, tono: 'gris' }]
    // Encabezado de la tabla: la línea que va justo encima del separador.
    if (esSeparador(lineas[i + 1] ?? '')) return [{ texto: l, tono: 'gris' }]

    const fila = /^(\s+)(\[[x !?]\])( \S+)(.*)$/.exec(l)
    if (fila) {
      const [, sangria, marca, nombre, resto] = fila as unknown as [string, string, string, string, string]
      return [
        { texto: sangria, tono: 'claro' },
        { texto: marca, ...MARCA[marca]! },
        { texto: nombre, tono: 'blanco' },
        { texto: resto, tono: 'claro' },
      ]
    }

    const aviso = /^(Aviso:|Warning:)(.*)$/.exec(l)
    if (aviso) {
      return [
        { texto: aviso[1]!, tono: 'blanco', negrita: true },
        { texto: aviso[2]!, tono: 'claro' },
      ]
    }

    if (/^(Marcas|Marks):/.test(l)) return [{ texto: l, tono: 'gris' }]
    // Encabezados cortos de sección ("Pack ...:", "Avisos:", "Otros plugins instalados:").
    if (/^\S[^.]*:$/.test(l) && l.length <= 48) return [{ texto: l, tono: 'gris' }]
    return [{ texto: l, tono: 'claro' }]
  })
}
