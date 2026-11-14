// Presentación monocroma de /portero, con la estética del HUD de consumo: blanco, grises y
// negro, sin color de acento. Solo decide el tono de cada trozo de texto; el texto no cambia.

// Paleta del pack. El rojo apagado queda para una alerta crítica; /portero no tiene ninguna.
export const TONO = {
  blanco: '#ffffff',
  claro: '#d4d4d4',
  gris: '#a3a3a3',
  oscuro: '#737373',
  alerta: '#b85c5c',
} as const

export type Tono = keyof typeof TONO

export type Tramo = { texto: string; tono: Tono; negrita?: boolean }

// Reparte cada línea de la salida de /portero en tramos con su tono: el título en blanco, los
// encabezados en gris, las barras con la parte llena en blanco y la vacía en gris.
export function lineasMonocromas(texto: string): Tramo[][] {
  return texto.split('\n').map((l, i): Tramo[] => {
    if (l.trim() === '') return []
    if (i === 0) return [{ texto: l, tono: 'blanco', negrita: true }]

    const conBarra = /^(\s+)(\S+)(\s+\d+\s+\d+%\s+)(█*)(░*)$/.exec(l)
    if (conBarra) {
      const [, sangria, nombre, cifras, llena, vacia] = conBarra as unknown as [string, string, string, string, string, string]
      return [
        { texto: sangria, tono: 'claro' },
        { texto: nombre, tono: 'blanco' },
        { texto: cifras, tono: 'claro' },
        { texto: llena, tono: 'blanco' },
        { texto: vacia, tono: 'gris' },
      ].filter(t => t.texto !== '') as Tramo[]
    }

    const regla = /^(\s+)(\[[x ]\])( \S+)(.*)$/.exec(l)
    if (regla) {
      const [, sangria, marca, nombre, resto] = regla as unknown as [string, string, string, string, string]
      const activa = marca === '[x]'
      return [
        { texto: sangria, tono: 'claro' },
        { texto: marca, tono: activa ? 'blanco' : 'gris' },
        { texto: nombre, tono: activa ? 'blanco' : 'gris' },
        { texto: resto, tono: activa ? 'claro' : 'gris' },
      ]
    }

    const caso = /^(\s+)(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d)(.*)$/.exec(l)
    if (caso) {
      return [
        { texto: caso[1]!, tono: 'claro' },
        { texto: caso[2]!, tono: 'gris' },
        { texto: caso[3]!, tono: 'claro' },
      ]
    }

    const aviso = /^(Avisos:)(.*)$/.exec(l)
    if (aviso) {
      return [
        { texto: aviso[1]!, tono: 'blanco', negrita: true },
        { texto: aviso[2]!, tono: 'claro' },
      ]
    }

    const dato = /^((?:Registro|Modelo pesado):)(.*)$/.exec(l)
    if (dato) {
      return [
        { texto: dato[1]!, tono: 'gris' },
        { texto: dato[2]!, tono: 'claro' },
      ]
    }

    // Encabezados de sección ("Reparto de rutas:", "Por capa:", "Últimos casos:").
    if (/^\S[^.]*:$/.test(l) && l.length <= 48) return [{ texto: l, tono: 'gris' }]
    return [{ texto: l, tono: 'claro' }]
  })
}
