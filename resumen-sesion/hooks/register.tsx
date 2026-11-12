import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const IDLE_MS = 2 * 60 * 60 * 1000 // umbral de inactividad: 2 horas
const lastAt = atom({ plugin: 'resumen-sesion', key: 'lastAt' } as const, 0)

const textOf = (m: unknown): string => {
  const c = (m as { content?: unknown })?.content
  if (typeof c === 'string') return c
  if (Array.isArray(c)) {
    return c.map(p => (p && typeof p === 'object' && 'text' in p ? String((p as { text: unknown }).text) : '')).join(' ')
  }
  return ''
}

export const register: Register = on => {
  on('turn.complete', async ($, e, next) => {
    const now = await $.clock.now()
    await update($, lastAt, () => now)
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.isMeta || e.command || !e.text.trim()) return next(e)

    const now = await $.clock.now()
    const last = await read($, lastAt)
    if (last === 0 || now - last < IDLE_MS) return next(e)

    const hours = Math.round((now - last) / 3600000)
    $.ui.status(`resumen-sesion: vuelta tras ${hours} h`)

    let resumen = ''
    try {
      const msgs = (await $.session.messages()) as unknown[]
      const hist = msgs.slice(-30).map(textOf).filter(Boolean).map(s => s.slice(0, 800)).join('\n---\n')
      const r = await $.model.complete({
        model: 'haiku',
        prompt:
          'Resume en 10 líneas como nota de traspaso: objetivo, decisiones tomadas, archivos tocados y pendiente. Solo el resumen, sin introducción.\n\n' +
          hist,
      })
      resumen = r.isAnswered ? r.text : ''
    } catch {
      resumen = ''
    }

    if (!resumen) return next(e)

    $.ui.toast(`Sesión retomada tras ${hours} h. Para ahorrar tokens, empieza una sesión nueva con el resumen que tienes en contexto.`)
    return next({
      ...e,
      context: [
        ...(e.context ?? []),
        `[resumen-sesion] Resumen de traspaso de la sesión anterior (leído tras ${hours} h de inactividad):\n${resumen}`,
      ],
    })
  })
}
