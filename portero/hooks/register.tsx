import type { Hook, Register } from 'claude-code'

import {
  clasificarPorReglas,
  type Config,
  contextoReciente,
  type Decision,
  DEFAULTS,
  describirReglas,
  leerConfig,
  leerOverride,
  type Mensaje,
  recortar,
  type Ruta,
} from './reglas'
import { lineasMonocromas, TONO } from './presentacion'
import { anadir, ARCHIVO, type Entrada, parsear, resumen, serializar } from './registro'
import { expandir, unir } from './rutas'

type Ctx = Parameters<Hook<'prompt.submit'>>[0]

const GUIDE =
  'Clasifica la petición de un usuario a un asistente de programación.\n' +
  'ligera: pregunta corta, formato, traducción, cambio trivial de una línea.\n' +
  'pesada: arquitectura, depuración, análisis largo, refactor, código nuevo o varios archivos.\n' +
  'dudosa: no estás seguro.\nResponde solo con la etiqueta.'
const LABELS = ['ligera', 'pesada', 'dudosa'] as const

const USAGE = 'Uso: /portero (reparto, últimos casos y reglas que más disparan) o /portero reglas (reglas activas).'

const errorText = (err: unknown): string => (err instanceof Error ? err.message : String(err))

// Configuración vigente: register() la fija al cargar; un cambio en userConfig recarga el módulo.
let cfg: Config = DEFAULTS

// Estado de la sesión en memoria (se reinicia al recargar el módulo).
let isHeavy = false
let rutaAnterior: Ruta | undefined
let cache: Entrada[] | null = null
let cola: Promise<void> = Promise.resolve()

// Carpeta y archivo del registro. "~" es la carpeta del usuario; sin ella, la carpeta
// "datos" del propio plugin.
async function carpeta($: Ctx): Promise<string> {
  let home: string | undefined
  try {
    home = (await $.env.get('USERPROFILE')) || (await $.env.get('HOME')) || undefined
  } catch {
    home = undefined
  }
  return expandir(cfg.dataDir, home) ?? unir($.plugin.root, 'datos')
}
async function archivo($: Ctx): Promise<string> {
  return unir(await carpeta($), ARCHIVO)
}

async function leerRegistro($: Ctx): Promise<Entrada[]> {
  if (cache) return cache
  const file = await archivo($)
  try {
    cache = (await $.fs.exists(file)) ? parsear(String(await $.fs.read(file))) : []
  } catch {
    cache = []
  }
  return cache
}

// Escribe una decisión. Nunca lanza; las escrituras van en cola para no pisarse.
function registrar($: Ctx, d: Decision, texto: string, aviso?: string): Promise<void> {
  if (!cfg.logEnabled) return Promise.resolve()
  const entrada: Entrada = {
    ts: new Date().toISOString(),
    ruta: d.ruta,
    capa: d.capa,
    motivo: d.motivo,
    texto: recortar(texto, cfg.logTextChars),
    longitud: texto.length,
    ...(aviso ? { aviso: recortar(aviso, 200) } : {}),
  }
  cola = cola
    .then(async () => {
      const previas = await leerRegistro($)
      cache = anadir(previas, entrada, cfg.logMaxEntries)
      await $.fs.write(await archivo($), serializar(cache))
    })
    .catch(err => {
      $.ui.status(`portero: no se pudo escribir el registro (${errorText(err)})`)
    })
  return cola
}

// Mensajes recientes de la conversación principal; [] si no se pueden leer.
async function leerMensajes($: Ctx): Promise<Mensaje[]> {
  try {
    const m = (await $.session.messages()) as unknown
    return Array.isArray(m) ? (m as Mensaje[]) : []
  } catch {
    return []
  }
}

export const register: Register = (on, options) => {
  cfg = leerConfig(options)
  isHeavy = false
  rutaAnterior = undefined
  cache = null

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'portero',
      description: 'Reparto de rutas, últimos casos y reglas que más disparan; "reglas" lista las activas',
      argumentHint: '[reglas]',
    })
    return next(e)
  }).catch((_, e, next) => next(e))

  on('command.run', { command: 'portero' }, async ($, e) => {
    const sub = (e.args ?? '').trim().toLowerCase()
    const file = await archivo($)
    if (sub === 'reglas' || sub === 'rules') return { text: describirReglas(cfg, file) }
    if (sub !== '') return { text: USAGE }
    if (!cfg.logEnabled) return { text: `El registro está desactivado (logEnabled).\n\n${describirReglas(cfg, file)}` }
    cache = null // relee: puede haberlo escrito otra sesión
    const entradas = await leerRegistro($)
    return { text: resumen(entradas, file) }
  })

  on('prompt.submit', async ($, e, next) => {
    isHeavy = false
    if (e.command || e.isMeta || !e.text.trim()) return next(e)

    const original = e.text
    const ov = leerOverride(original)
    const texto = ov ? ov.texto : original

    let mensajes: Mensaje[] | null = null
    let decision: Decision | null = null
    let aviso: string | undefined
    if (ov) {
      decision = { ruta: ov.ruta, capa: 'override', motivo: `override:!${ov.ruta}` }
    } else {
      let herramientasUltimo = 0
      const anteriorPesada = rutaAnterior === 'pesada' || rutaAnterior === 'dudosa'
      if (cfg.reglas.historial && anteriorPesada && texto.length < cfg.lightLength) {
        const ultimo = [...(mensajes ??= await leerMensajes($))].reverse().find(m => m.role === 'assistant')
        herramientasUltimo = ultimo?.toolUses?.length ?? 0
      }
      decision = clasificarPorReglas(texto, cfg, { rutaAnterior, herramientasUltimo })
    }

    if (!decision) {
      try {
        const pista = rutaAnterior ? `\nRuta de la petición anterior: ${rutaAnterior}.` : ''
        const kind = await $.model.classify(`${GUIDE}${pista}\n\nPetición:\n${texto.slice(0, 2000)}`, LABELS, {
          model: cfg.classifierModel,
        })
        if (kind === 'ligera' || kind === 'pesada' || kind === 'dudosa') {
          decision = { ruta: kind, capa: 'modelo', motivo: `modelo:${kind}` }
        } else {
          decision = { ruta: 'dudosa', capa: 'modelo', motivo: 'modelo:sin-respuesta' }
        }
      } catch (err) {
        aviso = `clasificador no disponible: ${errorText(err)}`
        decision = { ruta: 'pesada', capa: 'fallo', motivo: 'fallo-clasificador' }
      }
    }

    rutaAnterior = decision.ruta
    await registrar($, decision, texto, aviso)
    const base = { ...e, text: texto }

    if (decision.ruta === 'ligera') {
      $.ui.status(`portero: ligera (${decision.motivo}) → modelo de la sesión`)
      return next({
        ...base,
        context: [...(e.context ?? []), '[portero] Tarea LIGERA. Respuesta breve y directa, sin subagentes.'],
      })
    }

    // Pesada o dudosa: se delega. La dudosa lleva el doble de contexto.
    isHeavy = true
    const dudosa = decision.ruta === 'dudosa'
    const factor = dudosa ? 2 : 1
    const maxMensajes = cfg.contextMessages * factor
    const maxChars = cfg.contextChars * factor
    const reciente = maxMensajes > 0 && maxChars > 0 ? contextoReciente((mensajes ??= await leerMensajes($)), texto, maxMensajes, maxChars) : ''
    $.ui.status(
      aviso
        ? `portero: clasificador no disponible → pesada → ${cfg.heavyModel}`
        : `portero: ${decision.ruta} (${decision.motivo}) → ${cfg.heavyModel}`,
    )
    const nota =
      `[portero] Tarea ${dudosa ? 'DUDOSA (va por la ruta pesada)' : 'PESADA'}. ` +
      `Delégala completa con la herramienta Agent (model "${cfg.heavyModel}"). ` +
      (dudosa ? 'Pide al subagente que valore primero el alcance antes de actuar. ' : '') +
      (reciente
        ? `Pasa al subagente el contexto reciente siguiente y devuelve su resultado sin rehacer el trabajo.\n\nContexto reciente:\n${reciente}`
        : 'Devuelve su resultado sin rehacer el trabajo.')
    return next({ ...base, context: [...(e.context ?? []), nota] })
  }).catch((_, e, next) => next(e))

  on('agent.spawn', (_, e, next) => {
    if (isHeavy && !e.fork && !e.model) return next({ ...e, model: cfg.heavyModel })
    return next(e)
  }).catch((_, e, next) => next(e))

  // Dibujo monocromo de la salida de /portero: el texto es el mismo; solo cambian los tonos.
  on('ui.render', { component: 'CommandOutput', props: { command: 'portero' } }, async ($, e, next) => {
    if (e.props.isErrored) return next(e)
    try {
      const { Box, Text } = $.ui.resolve(e)
      return (
        <Box flexDirection="column">
          {lineasMonocromas(e.props.text).map(l => (
            <Text wrap="wrap">
              {l.length === 0
                ? ' '
                : l.map(t => (
                    <Text color={TONO[t.tono]} weight={t.negrita ? 'bold' : undefined}>
                      {t.texto}
                    </Text>
                  ))}
            </Text>
          ))}
        </Box>
      )
    } catch {
      return next(e)
    }
  })
}
