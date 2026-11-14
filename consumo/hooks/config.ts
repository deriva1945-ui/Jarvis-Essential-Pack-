import type { PluginOptions } from 'claude-code'

import type { HistoricoConfig, HudConfig, HudIdioma, HudPanel, HudTema } from '../types'

// Opciones de personalización del HUD (userConfig de plugin.json). Los valores por defecto
// tienen que coincidir con los "default" del manifiesto.
export const TEMAS: readonly HudTema[] = ['mark-ii', 'mark-l', 'stark', 'hibrido', 'claro', 'natural']
export const IDIOMAS: readonly HudIdioma[] = ['es', 'en']
export const PANELES: readonly HudPanel[] = ['contexto', 'coste', 'reparto', 'agentes', 'historial', 'grafica', 'comparativa', 'plan']
export const ACTUALIZACION_MIN = 1
export const ACTUALIZACION_MAX = 5

export const CONFIG_DEFAULT: HudConfig = {
  tema: 'natural',
  acento: '#7fe7ff',
  idioma: 'es',
  actualizacion: 1,
  paneles: [...PANELES],
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

const uno = <T extends string>(lista: readonly T[], v: unknown): T | undefined =>
  typeof v === 'string' ? lista.find(x => x === v.trim().toLowerCase()) : undefined

const texto = (v: unknown): string => (typeof v === 'string' ? JSON.stringify(v) : String(v))

// Lee y valida las opciones. Un valor que falta toma el defecto sin aviso; uno que no vale
// toma el defecto y deja un aviso (register los escribe en el log al empezar la sesión).
// La antigua opción densidad (comodo / compacto, hasta la 0.6.0) ya no existe: la densidad la elige la página según el
// tamaño de la ventana. Si un settings.json viejo la trae, se ignora sin aviso y sin fallar, como cualquier clave desconocida.
export function leerConfig(options: PluginOptions): { config: HudConfig; avisos: string[] } {
  const avisos: string[] = []
  const c: HudConfig = { ...CONFIG_DEFAULT, paneles: [...CONFIG_DEFAULT.paneles] }

  const elegir = <K extends 'tema' | 'idioma'>(clave: K, lista: readonly HudConfig[K][]) => {
    const v = options[clave]
    if (v === undefined) return
    const ok = uno(lista, v)
    if (ok !== undefined) c[clave] = ok
    else avisos.push(`${clave} = ${texto(v)} no es válido (${lista.join(', ')}); se usa ${CONFIG_DEFAULT[clave]}`)
  }
  elegir('tema', TEMAS)
  elegir('idioma', IDIOMAS)

  const acento = options['acento']
  if (acento !== undefined) {
    if (typeof acento === 'string' && HEX.test(acento.trim())) c.acento = acento.trim().toLowerCase()
    else avisos.push(`acento = ${texto(acento)} no es un color hex (#rgb o #rrggbb); se usa ${CONFIG_DEFAULT.acento}`)
  }

  const act = options['actualizacion']
  if (act !== undefined) {
    const n = typeof act === 'number' ? act : typeof act === 'string' && act.trim() !== '' ? Number(act) : NaN
    if (Number.isFinite(n) && n >= ACTUALIZACION_MIN && n <= ACTUALIZACION_MAX) c.actualizacion = n
    else
      avisos.push(
        `actualizacion = ${texto(act)} está fuera de ${ACTUALIZACION_MIN}–${ACTUALIZACION_MAX} s; se usa ${CONFIG_DEFAULT.actualizacion}`,
      )
  }

  const pan = options['paneles']
  if (pan !== undefined) {
    // Lista de textos; un texto suelto se lee como lista separada por comas.
    const pedidos = Array.isArray(pan) ? pan : typeof pan === 'string' ? pan.split(',') : null
    if (pedidos === null) {
      avisos.push(`paneles = ${texto(pan)} no es una lista; se muestran todos`)
    } else {
      const validos = new Set<HudPanel>()
      const malos: string[] = []
      for (const p of pedidos) {
        const ok = uno(PANELES, p)
        if (ok !== undefined) validos.add(ok)
        else if (String(p).trim() !== '') malos.push(String(p).trim())
      }
      if (malos.length > 0) avisos.push(`paneles desconocidos ignorados: ${malos.join(', ')} (válidos: ${PANELES.join(', ')})`)
      if (validos.size === 0) avisos.push('paneles no tiene ningún panel válido; se muestran todos')
      else c.paneles = PANELES.filter(p => validos.has(p))
    }
  }

  return { config: c, avisos }
}

// Histórico entre sesiones: historico (true por defecto) y retencionDias (días por día que se guardan, 365 por defecto).
// Van aparte de HudConfig porque no los lee la página: solo el mod.
export const RETENCION_MIN = 1
export const RETENCION_MAX = 3650
export const HISTORICO_DEFAULT: HistoricoConfig = { activo: true, retencionDias: 365 }

export function leerHistorico(options: PluginOptions): { config: HistoricoConfig; avisos: string[] } {
  const avisos: string[] = []
  const c: HistoricoConfig = { ...HISTORICO_DEFAULT }
  const h = options['historico']
  if (h !== undefined) {
    if (typeof h === 'boolean') c.activo = h
    else if (typeof h === 'string' && /^(true|false)$/i.test(h.trim())) c.activo = h.trim().toLowerCase() === 'true'
    else avisos.push(`historico = ${texto(h)} no es true ni false; se usa true`)
  }
  const r = options['retencionDias']
  if (r !== undefined) {
    const n = typeof r === 'number' ? r : typeof r === 'string' && r.trim() !== '' ? Number(r) : NaN
    if (Number.isInteger(n) && n >= RETENCION_MIN && n <= RETENCION_MAX) c.retencionDias = n
    else
      avisos.push(
        `retencionDias = ${texto(r)} no es un número entero de ${RETENCION_MIN} a ${RETENCION_MAX}; se usa ${HISTORICO_DEFAULT.retencionDias}`,
      )
  }
  return { config: c, avisos }
}
