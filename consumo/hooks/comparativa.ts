import type { CompRow, Comparativa, Familia } from '../types'

// Comparativa "Haiku frente a Opus", sin tabla de precios: el coste por token de cada familia sale
// de tus propios turnos (coste del turno según el contador de la sesión / tokens del turno).
// Funciones puras: update() puede llamarlas varias veces con el mismo valor.

// Tokens con coste que necesita cada familia (Haiku y Opus) para entrar en la estimación: más de esto.
export const MIN_TOKENS = 1000

export const COMP0: Record<string, CompRow> = {}

const FAMILIAS: readonly Familia[] = ['haiku', 'opus', 'fable', 'sonnet', 'otro']

export const familia = (model: string): Familia => {
  const m = model.toLowerCase()
  return FAMILIAS.find(f => f !== 'otro' && m.includes(f)) ?? 'otro'
}

const r6 = (x: number) => Math.round(x * 1e6) / 1e6
const r1 = (x: number) => Math.round(x * 10) / 10

export type TurnTokens = { input: number; output: number; cacheRead: number; cacheWrite: number }

// Suma un turno (ya filtrado: nuevo, no repetido) al acumulado de su modelo.
// cost null: sus tokens cuentan en el reparto, pero no en el coste por token.
export const sumar = (m: Record<string, CompRow>, model: string, u: TurnTokens, cost: number | null): Record<string, CompRow> => {
  const cur = m[model] ?? { turns: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, costTurns: 0, costTokens: 0, cost: 0 }
  const tokens = u.input + u.output + u.cacheRead + u.cacheWrite
  const ok = cost !== null && Number.isFinite(cost)
  return {
    ...m,
    [model]: {
      turns: cur.turns + 1,
      input: cur.input + u.input,
      output: cur.output + u.output,
      cacheRead: cur.cacheRead + u.cacheRead,
      cacheWrite: cur.cacheWrite + u.cacheWrite,
      costTurns: cur.costTurns + (ok ? 1 : 0),
      costTokens: cur.costTokens + (ok ? tokens : 0),
      cost: r6(cur.cost + (ok ? (cost as number) : 0)),
    },
  }
}

type Fam = { tokens: number; costTurns: number; costTokens: number; cost: number }

// Por qué una familia no vale para la estimación; null si vale.
const falta = (f: Fam | undefined, nombre: string): string | null => {
  if (!f || f.costTurns < 1) return 'sin datos de ' + nombre + ' todavía'
  if (f.costTokens <= MIN_TOKENS)
    return 'sin datos de ' + nombre + ' todavía: ' + nombre + ' solo lleva ' + f.costTokens + ' tokens con coste (hacen falta más de ' + MIN_TOKENS + '), así que no se usa para la estimación'
  if (f.cost <= 0) return 'sin datos de ' + nombre + ' todavía: sus turnos no tienen coste medido'
  return null
}

// El bloque "comparativa" de datos.js.
// costeReal: suma del coste de los turnos contados (cada turno una vez).
// Estimación "todo en Opus": los turnos que fueron a Haiku se repreciarían al coste por token de Opus:
//   coste_haiku_en_opus = tokens_haiku × coste_por_token_haiku × (coste_por_token_opus / coste_por_token_haiku)
//   costeOpusEstimado   = costeReal - coste_haiku + coste_haiku_en_opus
// El resto de la sesión (el modelo principal) cuesta lo mismo en los dos casos.
export const calcular = (m: Record<string, CompRow>): Comparativa => {
  const fams: Partial<Record<Familia, Fam>> = {}
  for (const k of Object.keys(m)) {
    const x = m[k]
    if (!x) continue
    const f = familia(k)
    const cur = fams[f] ?? { tokens: 0, costTurns: 0, costTokens: 0, cost: 0 }
    fams[f] = {
      tokens: cur.tokens + x.input + x.output + x.cacheRead + x.cacheWrite,
      costTurns: cur.costTurns + x.costTurns,
      costTokens: cur.costTokens + x.costTokens,
      cost: cur.cost + x.cost,
    }
  }
  const costeReal = r6(FAMILIAS.reduce((a, f) => a + (fams[f]?.cost ?? 0), 0))
  const tokensPorModelo = FAMILIAS.flatMap(f => {
    const x = fams[f]
    return x && (x.tokens > 0 || x.cost > 0) ? [{ familia: f, tokens: x.tokens, coste: r6(x.cost) }] : []
  }).sort((a, b) => b.tokens - a.tokens)
  const h = fams.haiku
  const o = fams.opus
  const motivo = falta(o, 'Opus') ?? falta(h, 'Haiku')
  if (motivo || !h || !o) {
    return { disponible: false, motivo: motivo ?? 'sin datos de Opus todavía', costeReal, costeOpusEstimado: null, ahorro: null, ahorroPct: null, tokensPorModelo }
  }
  const cptO = o.cost / o.costTokens
  const cptH = h.cost / h.costTokens
  const est = r6(costeReal + h.cost * (cptO / cptH - 1))
  const ahorro = r6(est - costeReal)
  return {
    disponible: true,
    costeReal,
    costeOpusEstimado: est,
    ahorro,
    ahorroPct: est > 0 ? r1((ahorro * 100) / est) : 0,
    tokensPorModelo,
  }
}
