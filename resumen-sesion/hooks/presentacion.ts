// Presentación monocroma de /resumen y /resumen-ver, con la estética del HUD de consumo:
// blanco, grises y negro, sin color de acento. Solo decide el tono de cada trozo de texto.

// Paleta del pack. El rojo apagado queda para una alerta crítica; el resumen no tiene ninguna.
export const TONO = {
  blanco: '#ffffff',
  claro: '#d4d4d4',
  gris: '#a3a3a3',
  oscuro: '#737373',
  alerta: '#b85c5c',
} as const

export type Tono = keyof typeof TONO

export type Tramo = { texto: string; tono: Tono; negrita?: boolean }

// Separador gris que se dibuja en la línea en blanco de encima de cada sección.
export const SEPARADOR = '─'.repeat(40)

// Reparte cada línea de la salida en tramos con su tono. La primera línea (guardado, último
// resumen o fallo) y la cabecera "# ..." van en blanco; las secciones "## ..." llevan encima
// un separador gris.
export function lineasMonocromas(texto: string): Tramo[][] {
  const lineas = texto.split('\n')
  return lineas.map((l, i): Tramo[] => {
    if (l.trim() === '') {
      return /^## /.test(lineas[i + 1] ?? '') ? [{ texto: SEPARADOR, tono: 'gris' }] : []
    }
    if (i === 0) return [{ texto: l, tono: 'blanco' }]
    if (/^# /.test(l)) return [{ texto: l, tono: 'blanco', negrita: true }]
    const seccion = /^(## )(.*)$/.exec(l)
    if (seccion) {
      return [
        { texto: seccion[1]!, tono: 'gris' },
        { texto: seccion[2]!, tono: 'blanco', negrita: true },
      ]
    }
    if (/^─{2,}.*─{2,}$/.test(l)) return [{ texto: l, tono: 'gris' }]
    const dato = /^((?:Fecha|Date|Origen|Source):)(.*)$/.exec(l)
    if (dato) {
      return [
        { texto: dato[1]!, tono: 'gris' },
        { texto: dato[2]!, tono: 'claro' },
      ]
    }
    if (/^\((ninguno|none|no disponible|not available)/.test(l)) return [{ texto: l, tono: 'gris' }]
    const vineta = /^(\s*- )(.*)$/.exec(l)
    if (vineta) {
      return [
        { texto: vineta[1]!, tono: 'gris' },
        { texto: vineta[2]!, tono: 'claro' },
      ]
    }
    return [{ texto: l, tono: 'claro' }]
  })
}
