import type { PlanEstado, PlanState } from '../types'

// Progreso del plan de Claude a partir de sus llamadas a TaskCreate y TaskUpdate.
// Funciones puras: update() puede llamarlas varias veces con el mismo valor.

export const PLAN0: PlanState = { orden: [], tareas: {} }

export type PlanData = {
  total: number
  completadas: number
  enCurso: number
  porcentaje: number
  tareas: { titulo: string; estado: 'pendiente' | 'en curso' | 'completada' }[]
}

const ESTADOS: readonly PlanEstado[] = ['pending', 'in_progress', 'completed']
const NOMBRE = { pending: 'pendiente', in_progress: 'en curso', completed: 'completada' } as const

// TaskCreate: una tarea nueva, pendiente. El id sale del resultado de la herramienta.
// Un id ya visto (llamada repetida) no añade otra tarea: solo actualiza el título.
export const crear = (p: PlanState, id: string, titulo: string): PlanState => {
  const cur = p.tareas[id]
  return {
    orden: cur ? p.orden : [...p.orden, id],
    tareas: { ...p.tareas, [id]: { titulo: titulo || cur?.titulo || id, estado: cur?.estado ?? 'pending' } },
  }
}

// TaskUpdate: cambia el estado y, si llega, el título. "deleted" la quita del plan.
// Un id que el mod no vio crear (sesión reanudada) entra con el título que traiga, o su id.
export const actualizar = (p: PlanState, id: string, cambio: { status?: string; subject?: string }): PlanState => {
  if (cambio.status === 'deleted') {
    if (!p.tareas[id]) return p
    const tareas = { ...p.tareas }
    delete tareas[id]
    return { orden: p.orden.filter(x => x !== id), tareas }
  }
  const cur = p.tareas[id]
  const estado = ESTADOS.find(s => s === cambio.status) ?? cur?.estado ?? 'pending'
  const titulo = cambio.subject || cur?.titulo || id
  return {
    orden: cur ? p.orden : [...p.orden, id],
    tareas: { ...p.tareas, [id]: { titulo, estado } },
  }
}

// El bloque "plan" de datos.js. Sin tareas: null.
export const resumen = (p: PlanState): PlanData | null => {
  const ls = p.orden.flatMap(id => (p.tareas[id] ? [p.tareas[id]] : []))
  const total = ls.length
  if (!total) return null
  const completadas = ls.filter(t => t.estado === 'completed').length
  const enCurso = ls.filter(t => t.estado === 'in_progress').length
  return {
    total,
    completadas,
    enCurso,
    porcentaje: Math.round((completadas * 100) / total),
    tareas: ls.map(t => ({ titulo: t.titulo, estado: NOMBRE[t.estado] })),
  }
}

// Id de la tarea en el resultado de TaskCreate ({ task: { id, subject } }), sin fiarse de la forma.
export const idCreada = (result: unknown): { id: string; subject?: string } | null => {
  const task = (result as { task?: { id?: unknown; subject?: unknown } } | null | undefined)?.task
  if (!task || (typeof task.id !== 'string' && typeof task.id !== 'number')) return null
  return { id: String(task.id), ...(typeof task.subject === 'string' ? { subject: task.subject } : {}) }
}
