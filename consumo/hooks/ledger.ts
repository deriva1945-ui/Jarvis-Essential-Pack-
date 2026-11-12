import type { Ledger } from '../types'

// Turnos recordados para descartar un turn.complete repetido.
export const IDS_MAX = 500

// Una lectura del contador de coste de la sesión. Puro: update() puede llamarlo varias veces.
// - Un turno ya contado (mismo id) se marca dup y no cambia nada.
// - Sin lectura previa no se sabe cuánto costó el turno: null, nunca todo lo acumulado.
// - Si el contador baja (/clear o una sesión reanudada que empieza de cero), lo anterior pasa a base
//   y el turno se lleva solo lo nuevo: nunca negativo ni contado dos veces.
export const observe = (v: Ledger, cost: number | undefined, id?: string): Ledger => {
  if (id !== undefined && v.ids.includes(id)) return { ...v, turn: { id, dup: true, cost: null } }
  let { last, base } = v
  let delta: number | null = null
  if (cost !== undefined && Number.isFinite(cost)) {
    if (last === null) delta = null
    else if (cost >= last) delta = cost - last
    else {
      base += last
      delta = cost
    }
    last = cost
  }
  const ids = id === undefined ? v.ids : [...v.ids, id].slice(-IDS_MAX)
  return { last, base, ids, turn: id === undefined ? v.turn : { id, dup: false, cost: delta === null ? null : Math.round(delta * 1e6) / 1e6 } }
}
