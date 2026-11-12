import type { Register } from 'claude-code'

const HEAVY_MODEL = 'opus' // o 'fable'

// Atajos manuales: "!pesada ..." o "!ligera ..." deciden sin consultar nada.
const OVERRIDE = /^\s*!(pesada|ligera)\b/i

// Reglas que fuerzan lo pesado sin consultar al clasificador.
const HEAVY_PATTERNS = [
  /arquitect|diseña|diseñ|rediseñ|migra|refactor|optimi[sz]a|rendimiento|performance/i,
  /depura|debug|bug|error|excepci[oó]n|stack ?trace|falla|crash|no funciona|race|deadlock|memory leak/i,
  /seguridad|security|vulnerab|concurren|analiza|análisis|investiga|por qué|todo el proyecto/i,
  /\b(varios|múltiples|todos los) (archivos|ficheros|m[oó]dulos)\b/i,
  /[\w/.-]+\.(ts|tsx|js|jsx|py|go|rs|java|cs|cpp|c|h|rb|php|sql|ya?ml|json)\b/i,
]

// Reglas que dejan pasar lo ligero sin consultar (solo si la petición es corta).
const LIGHT_PATTERNS = [
  /^\s*(traduce|traduzca|translate|tradúceme)\b/i,
  /^\s*(formatea|ordena|pon en (lista|tabla)|corrige la ortograf[ií]a)\b/i,
  /^\s*(qu[eé] (es|significa)|cu[aá]l es|cu[aá]nto|cu[aá]ndo|d[oó]nde)\b/i,
]

const GUIDE =
  'ligera: pregunta corta, formato, traducción, cambio trivial de una línea. ' +
  'pesada: arquitectura, depuración, análisis largo, refactor o varios archivos. ' +
  'dudosa: no estás seguro. Responde solo con la etiqueta.'
const LABELS = ['ligera', 'pesada', 'dudosa'] as const

const textOf = (m: unknown): string => {
  const c = (m as { content?: unknown })?.content
  if (typeof c === 'string') return c
  if (Array.isArray(c)) {
    return c.map(p => (p && typeof p === 'object' && 'text' in p ? String((p as { text: unknown }).text) : '')).join(' ')
  }
  return ''
}

export const register: Register = on => {
  let isHeavy = false

  on('prompt.submit', async ($, e, next) => {
    isHeavy = false
    if (e.command || e.isMeta || !e.text.trim()) return next(e)

    const t = e.text
    const override = OVERRIDE.exec(t)?.[1]?.toLowerCase()
    let route: 'pesada' | 'ligera' | undefined

    if (override) route = override as 'pesada' | 'ligera'
    else if (t.length > 600 || t.includes('```') || HEAVY_PATTERNS.some(p => p.test(t))) route = 'pesada'
    else if (t.length < 200 && LIGHT_PATTERNS.some(p => p.test(t))) route = 'ligera'

    if (route === undefined) {
      try {
        const kind = await $.model.classify(`${GUIDE}\n\nPetición:\n${t.slice(0, 2000)}`, LABELS, { model: 'haiku' })
        route = kind === 'ligera' ? 'ligera' : 'pesada' // dudosa, sin respuesta o pesada: sube de modelo
      } catch {
        route = 'pesada'
      }
    }

    if (route === 'ligera') {
      $.ui.status('portero: ligera → modelo de la sesión')
      return next({ ...e, context: [...(e.context ?? []), '[portero] Tarea LIGERA. Respuesta breve y directa, sin subagentes.'] })
    }

    isHeavy = true
    $.ui.status(`portero: pesada → ${HEAVY_MODEL}`)
    let recent = ''
    try {
      const msgs = (await $.session.messages()) as unknown[]
      recent = msgs.slice(-4).map(textOf).filter(Boolean).map(s => s.slice(0, 1200)).join('\n---\n')
    } catch {
      recent = '(no disponible)'
    }
    return next({
      ...e,
      context: [
        ...(e.context ?? []),
        `[portero] Tarea PESADA. Delégala completa con la herramienta Agent (model "${HEAVY_MODEL}"). Pasa al subagente el contexto reciente siguiente y devuelve su resultado sin rehacer el trabajo.\n\nContexto reciente:\n${recent}`,
      ],
    })
  }).catch(($, e, next) => next(e))

  on('agent.spawn', ($, e, next) => {
    if (isHeavy && !e.fork && !e.model) return next({ ...e, model: HEAVY_MODEL })
    return next(e)
  }).catch(($, e, next) => next(e))
}
