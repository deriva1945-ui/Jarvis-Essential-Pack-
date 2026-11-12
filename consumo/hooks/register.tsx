import { atom, read, update } from 'claude-code'
import type { Hook, Register, Timer } from 'claude-code'

import type { AgentRow, CompRow, Comparativa, CtxSnap, Familia, Ledger, ModelRow, PlanState, TurnRec } from '../types'
import { calcular, COMP0, familia, sumar } from './comparativa'
import { observe } from './ledger'
import type { PlanData } from './plan'
import { actualizar, crear, idCreada, PLAN0, resumen } from './plan'
import { PAGE } from './page'
import { DATA_DIR_DEFAULT, expandir, fileUrl, unir } from './rutas'

const SHAPE = { shape: 'consumo-1' }
const SHAPE2 = { shape: 'consumo-2' }
const HIST_MAX = 20
// Cada cuánto se reescribe datos.js aunque no haya turnos: la página avisa si pasan 10 s sin latido.
const BEAT_MS = 3000
const WARN = 70
const CRIT = 85

const rows = atom({ plugin: 'consumo', key: 'rows' } as const, {} as Record<string, AgentRow>, SHAPE)
const models = atom({ plugin: 'consumo', key: 'models' } as const, {} as Record<string, ModelRow>, SHAPE)
const hist = atom({ plugin: 'consumo', key: 'hist' } as const, [] as TurnRec[], SHAPE)
const labels = atom({ plugin: 'consumo', key: 'labels' } as const, {} as Record<string, string>, SHAPE)
const ctx = atom({ plugin: 'consumo', key: 'ctx' } as const, null as CtxSnap | null, SHAPE)
const LEDGER0: Ledger = { last: null, base: 0, ids: [], turn: null }
const ledger = atom({ plugin: 'consumo', key: 'ledger' } as const, LEDGER0, SHAPE2)
const plan = atom({ plugin: 'consumo', key: 'plan' } as const, PLAN0, { shape: 'consumo-plan-1' })
// Coste y tokens por modelo, para la comparativa Haiku frente a Opus.
const comp = atom({ plugin: 'consumo', key: 'comp' } as const, COMP0, { shape: 'consumo-comp-1' })
// Si el HUD está abierto, según lo último que hizo el mod (session.start o /jarvis).
const abierto = atom({ plugin: 'consumo', key: 'abierto' } as const, false, { shape: 'consumo-abierto-1' })

type ModeloData = {
  modelo: string
  familia: Familia
  entrada: number
  salida: number
  cache: number
  cacheEscritura: number
  turnos: number
  // Reparto del trabajo: % de entrada + salida, y % de turnos.
  reparto: number
  repartoTurnos: number
  // El modelo de la sesión principal (o el que ha contestado en el hilo principal).
  principal: boolean
}

type TurnoData = {
  hora: number
  agente: string
  modelo: string
  familia: Familia
  entrada: number
  salida: number
  cache: number
  cacheEscritura: number
  // Lo que subió el contador de coste de la sesión desde el turno anterior (aprox.).
  coste: number | null
}

type Data = {
  modelo: string
  contexto: CtxSnap
  alerta: 'normal' | 'alta' | 'critica'
  coste: number
  modelos: ModeloData[]
  agentes: { nombre: string; modelo: string; input: number; output: number; cacheRead: number; turns: number }[]
  historial: TurnoData[]
  // Progreso del plan (TaskCreate / TaskUpdate); null sin tareas.
  plan: PlanData | null
  // Haiku frente a Opus: coste real y estimado si el trabajo de Haiku hubiera ido a Opus.
  comparativa: Comparativa
  actualizado: number
  latido: number
}

const alerta = (c: CtxSnap | null): Data['alerta'] =>
  !c ? 'normal' : c.percent >= CRIT ? 'critica' : c.percent >= WARN ? 'alta' : 'normal'

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part * 1000) / whole) / 10 : 0)

const spent = (l: Ledger) => l.base + (l.last ?? 0)

const agentName = (k: string, lb: Record<string, string>) => (k === 'main' ? 'Principal' : (lb[k] ?? k))

const toModelos = (m: Record<string, ModelRow>, r: Record<string, AgentRow>, model: string): ModeloData[] => {
  const ids = Object.keys(m)
  const work = ids.reduce((a, k) => a + (m[k]?.input ?? 0) + (m[k]?.output ?? 0), 0)
  const turns = ids.reduce((a, k) => a + (m[k]?.turns ?? 0), 0)
  const mainModel = r['main']?.model
  return ids
    .map(k => {
      const x = m[k] ?? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, turns: 0 }
      return {
        modelo: k,
        familia: familia(k),
        entrada: x.input,
        salida: x.output,
        cache: x.cacheRead,
        cacheEscritura: x.cacheWrite,
        turnos: x.turns,
        reparto: pct(x.input + x.output, work),
        repartoTurnos: pct(x.turns, turns),
        principal: k === model || k === mainModel,
      }
    })
    .sort((a, b) => b.entrada + b.salida - (a.entrada + a.salida))
}

type Snap = {
  r: Record<string, AgentRow>
  m: Record<string, ModelRow>
  h: TurnRec[]
  lb: Record<string, string>
  c: CtxSnap | null
  t: Ledger
  p: PlanState
  k: Record<string, CompRow>
  model: string
  updated: number
}

const toData = ({ r, m, h, lb, c, t, p, k, model, updated }: Snap, now: number): Data => ({
  modelo: model,
  contexto: c ?? { tokens: 0, window: 1, percent: 0 },
  alerta: alerta(c),
  coste: Math.round(spent(t) * 1e6) / 1e6,
  modelos: toModelos(m, r, model),
  agentes: Object.keys(r).flatMap(k => {
    const a = r[k]
    if (!a) return []
    return [{ nombre: agentName(k, lb), modelo: a.model, input: a.input, output: a.output, cacheRead: a.cacheRead, turns: a.turns }]
  }),
  historial: h.map(x => ({
    hora: x.at,
    agente: agentName(x.agent, lb),
    modelo: x.model,
    familia: familia(x.model),
    entrada: x.input,
    salida: x.output,
    cache: x.cacheRead,
    cacheEscritura: x.cacheWrite,
    coste: x.cost,
  })),
  plan: resumen(p),
  comparativa: calcular(k),
  actualizado: updated,
  latido: now,
})

const EMPTY: Snap = { r: {}, m: {}, h: [], lb: {}, c: null, t: LEDGER0, p: PLAN0, k: COMP0, model: '', updated: 0 }

// Escribe los datos que lee la página. Un fallo aquí no debe romper la sesión.
const payload = (data: Data) => `window.CONSUMO = ${JSON.stringify(data)};`

type Ctx = Parameters<Hook<'tool.call'>>[0]

// Valor de la opción dataDir (userConfig). register() lo fija al cargar el módulo; un cambio
// en la configuración recarga el módulo con el valor nuevo.
let dataDirOption = DATA_DIR_DEFAULT

// Carpeta donde se escriben index.html, datos.js, estado.json y estado.js. "~" es la carpeta del
// usuario: USERPROFILE en Windows, HOME en macOS y Linux. Sin ninguna de las dos, la carpeta
// datos dentro del propio plugin.
async function carpeta($: Ctx): Promise<string> {
  let home: string | undefined
  try {
    home = (await $.env.get('USERPROFILE')) || (await $.env.get('HOME')) || undefined
  } catch {
    home = undefined
  }
  return expandir(dataDirOption, home) ?? expandir(DATA_DIR_DEFAULT, home) ?? unir($.plugin.root, 'datos')
}

let beat: Timer | undefined
// Hora del último cambio real de datos (turno o herramienta); el latido no la mueve.
let updatedAt = 0

async function snap($: Ctx): Promise<Snap> {
  return {
    r: await read($, rows),
    m: await read($, models),
    h: await read($, hist),
    lb: await read($, labels),
    c: await read($, ctx),
    t: await read($, ledger),
    p: await read($, plan),
    k: await read($, comp),
    model: await $.session.model(),
    updated: updatedAt,
  }
}

async function writeData($: Ctx): Promise<void> {
  try {
    const s = await snap($)
    await $.fs.write(unir(await carpeta($), 'datos.js'), payload(toData(s, await $.clock.now())))
  } catch {
    // La página se queda con los últimos datos y avisa cuando falta el latido.
  }
}

const errorText = (err: unknown): string => (err instanceof Error ? err.message : String(err))

// Interruptor del HUD. El mod no puede cerrar la ventana del navegador sin matar procesos ajenos,
// así que deja el estado en estado.json (y en estado.js, que es lo que la página puede cargar
// desde file://) y la página, al leer abierto:false, llama a window.close().
async function writeEstado($: Ctx, isOpen: boolean): Promise<string | null> {
  const json = JSON.stringify({ abierto: isOpen })
  try {
    const dir = await carpeta($)
    await $.fs.write(unir(dir, 'estado.json'), json)
    await $.fs.write(unir(dir, 'estado.js'), `window.CONSUMO_ESTADO = ${json};`)
    return null
  } catch (err) {
    return errorText(err)
  }
}

type Apertura = { isOpen: true } | { isOpen: false; reason: string }

// Escribe la página, los datos y el estado, y abre Edge (o Chrome) en modo --app.
async function abrirHud($: Ctx): Promise<Apertura> {
  const dir = await carpeta($)
  const page = unir(dir, 'index.html')
  // Cada paso por separado: si datos.js no se puede escribir, la ventana se abre igual
  // y la página muestra "sin señal" en vez de quedarse en blanco.
  try {
    await $.fs.write(page, PAGE)
  } catch (err) {
    // Sin página no hay ventana que abrir.
    return { isOpen: false, reason: `no se pudo escribir ${page} (${errorText(err)})` }
  }
  try {
    await $.fs.write(unir(dir, 'datos.js'), payload(toData({ ...EMPTY, t: await read($, ledger), p: await read($, plan), k: await read($, comp), model: await $.session.model() }, await $.clock.now())))
  } catch {
    // El latido lo vuelve a intentar cada 3 s.
  }
  // Antes de abrir: una ventana vieja que se quedó con el aviso de cerrado vuelve a pintar el HUD.
  await writeEstado($, true)
  const failures: string[] = []
  for (const browser of ['msedge', 'chrome']) {
    try {
      const run = await $.process.run(['cmd', '/c', 'start', '', browser, `--app=${fileUrl(page)}`])
      if (run.exitCode === 0) return { isOpen: true }
      failures.push(`${browser}: código ${run.exitCode}`)
    } catch (err) {
      failures.push(`${browser}: ${errorText(err)}`)
    }
  }
  // Sin navegador: los datos se siguen guardando por si se abre a mano.
  return { isOpen: false, reason: `no se pudo abrir Edge ni Chrome (${failures.join('; ')})` }
}

export const register: Register = (on, options) => {
  const opt = options['dataDir']
  dataDirOption = typeof opt === 'string' && opt.trim() !== '' ? opt : DATA_DIR_DEFAULT

  on('session.start', async ($, e, next) => {
    try {
      await $.command.register({ name: 'jarvis', description: 'Abre o cierra el HUD de consumo' })
    } catch {
      // Sin comando el HUD se abre igual al iniciar la sesión.
    }

    // Punto de partida del contador de coste: el coste de cada turno es lo que sube desde aquí.
    // Al reanudar o tras /clear el contador puede volver a empezar: observe() lo pasa a base.
    try {
      const u = await $.session.usage()
      await update($, ledger, v => observe(v, u.cost?.usd))
    } catch {
      // Sin contador todavía: el primer turno queda sin coste, no con todo lo acumulado.
    }

    try {
      const r = await abrirHud($)
      await update($, abierto, () => r.isOpen)
    } catch {
      // El HUD es opcional: la sesión sigue.
    }
    try {
      beat?.cancel()
      beat = $.clock.every(BEAT_MS, () => void writeData($))
    } catch {
      // Sin latido la página marca "sin señal", pero el resto sigue.
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // /jarvis: si el HUD está cerrado lo abre; si está abierto lo cierra.
  on('command.run', { command: 'jarvis' }, async $ => {
    if (await read($, abierto)) {
      const failed = await writeEstado($, false)
      await update($, abierto, () => false)
      if (failed !== null) {
        return {
          text:
            `No se pudo escribir ${unir(await carpeta($), 'estado.json')} (${failed}), así que la ventana no se enterará. ` +
            'Ciérrala a mano. Escribe /jarvis para abrir el HUD.',
        }
      }
      return {
        text:
          'HUD cerrado. Si la ventana sigue abierta (window.close() no funciona en todas las versiones de Edge), ' +
          'ciérrala a mano. Escribe /jarvis para abrirlo.',
      }
    }
    const r = await abrirHud($)
    await update($, abierto, () => r.isOpen)
    if (!r.isOpen) {
      return {
        text: `No se pudo abrir el HUD: ${r.reason}. Puedes abrir ${unir(await carpeta($), 'index.html')} a mano.`,
      }
    }
    return { text: 'HUD abierto. Escribe /jarvis otra vez para cerrarlo.' }
  }).catch(($, e, next) =>
    next.called ? next(e) : { text: 'consumo: no se pudo cambiar el estado del HUD con /jarvis.' },
  )

  on('agent.spawn', async ($, e, next) => {
    const r = await next(e)
    if (r.agentId) {
      await update($, labels, l => ({ ...l, [r.agentId as string]: `${e.subagentType}: ${e.description}` }))
    }
    return r
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const key = e.agentId ?? 'main'
    const u = e.usage
    const s = await $.session.usage()
    // Primero el libro: decide en un solo paso atómico si el turno es nuevo y cuánto costó.
    // Con subagentes en paralelo cada turno lee el contador una vez y no se pisan.
    const l = await update($, ledger, v => observe(v, s.cost?.usd, u ? e.turnId : undefined))
    const turn = u && l.turn && l.turn.id === e.turnId ? l.turn : null
    if (u && turn && !turn.dup) {
      await update($, rows, r => {
        const cur = r[key] ?? { model: '', input: 0, output: 0, cacheRead: 0, turns: 0 }
        return {
          ...r,
          [key]: {
            model: u.model,
            input: cur.input + u.input_tokens,
            output: cur.output + u.output_tokens,
            cacheRead: cur.cacheRead + u.cache_read_input_tokens,
            turns: cur.turns + 1,
          },
        }
      })
      // Agregado por modelo: un agente que cambia de modelo reparte bien sus turnos.
      const id = u.model || 'desconocido'
      await update($, models, m => {
        const cur = m[id] ?? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, turns: 0 }
        return {
          ...m,
          [id]: {
            input: cur.input + u.input_tokens,
            output: cur.output + u.output_tokens,
            cacheRead: cur.cacheRead + u.cache_read_input_tokens,
            cacheWrite: cur.cacheWrite + u.cache_creation_input_tokens,
            turns: cur.turns + 1,
          },
        }
      })
      // Comparativa: tokens por tipo y coste del turno, una vez por turno (ya filtrado arriba).
      await update($, comp, k =>
        sumar(k, id, { input: u.input_tokens, output: u.output_tokens, cacheRead: u.cache_read_input_tokens, cacheWrite: u.cache_creation_input_tokens }, turn.cost),
      )
      const at = await $.clock.now()
      await update($, hist, prev =>
        prev.some(x => x.id === e.turnId)
          ? prev
          : [
              ...prev,
              {
                id: e.turnId,
                at,
                agent: key,
                model: id,
                input: u.input_tokens,
                output: u.output_tokens,
                cacheRead: u.cache_read_input_tokens,
                cacheWrite: u.cache_creation_input_tokens,
                cost: turn.cost,
              },
            ].slice(-HIST_MAX),
      )
    }
    await update($, ctx, () => ({ tokens: s.context.tokens ?? 0, window: s.context.window, percent: s.context.percent ?? 0 }))
    updatedAt = await $.clock.now()
    await writeData($)
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    // El plan solo cambia con una llamada que la herramienta aceptó (sin deny ni error).
    if (ran.deny === undefined && !ran.isError) {
      try {
        if (e.tool === 'TaskCreate') {
          const t = idCreada(ran.result)
          if (t) await update($, plan, v => crear(v, t.id, t.subject ?? e.subject))
        } else if (e.tool === 'TaskUpdate' && e.taskId) {
          const id = String(e.taskId)
          await update($, plan, v => actualizar(v, id, { status: e.status, subject: e.subject }))
        }
      } catch {
        // Un fallo del plan no debe tocar la llamada ni el resto del HUD.
      }
    }
    const s = await $.session.usage()
    await update($, ctx, () => ({ tokens: s.context.tokens ?? 0, window: s.context.window, percent: s.context.percent ?? 0 }))
    updatedAt = await $.clock.now()
    await writeData($)
    return ran
  }).catch(($, e, next) => next(e))
}
