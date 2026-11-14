import { atom, read, update } from 'claude-code'
import type { Hook, Register } from 'claude-code'

import { lineasMonocromas, TONO } from './presentacion'

import type { UltimoResumen } from '../types'
import {
  CONFIG_DEFAULT,
  construirPrompt,
  extraerDatos,
  fechaTexto,
  formatear,
  historial,
  horasTexto,
  leerConfig,
  parsear,
  sugerencia,
} from './resumen'
import type { Config, Idioma, Mensaje, Meta } from './resumen'
import { ARCHIVO, DATA_DIR_DEFAULT, expandir, unir } from './rutas'

// Hora del último turno terminado (ms). 0: todavía ninguno.
const lastAt = atom({ plugin: 'resumen-sesion', key: 'lastAt' } as const, 0)
// Intentos automáticos fallidos seguidos: con 1, el siguiente mensaje vuelve a intentarlo.
const fallos = atom({ plugin: 'resumen-sesion', key: 'fallos' } as const, 0)
// Copia en memoria del último resumen guardado, por si el archivo no se puede leer.
const ultimo = atom({ plugin: 'resumen-sesion', key: 'ultimo' } as const, null as UltimoResumen | null, { shape: 'ultimo-1' })

// Intentos automáticos seguidos antes de rendirse (el primero y un reintento).
const MAX_INTENTOS = 2
const MODELO = 'haiku'
const TIMEOUT_MS = 60_000

type Ctx = Parameters<Hook<'prompt.submit'>>[0]

const UI: Record<
  Idioma,
  {
    listoAuto: (h: string, ruta: string) => string
    guardado: (ruta: string) => string
    noGuardado: (ruta: string, err: string) => string
    fallo: (motivo: string) => string
    reintento: string
    rendido: string
    parcial: string
    conservado: (ruta: string) => string
    contexto: (h: string) => string
    contextoParcial: string
    ver: (ruta: string, fecha: string) => string
    verMemoria: (ruta: string) => string
    nada: (ruta: string) => string
    motivo: { api: (s: string) => string; vacia: string; abortada: string; excepcion: (m: string) => string }
    descResumen: string
    descVer: string
  }
> = {
  es: {
    listoAuto: (h, ruta) =>
      `Resumen de traspaso listo tras ${h} h sin actividad. Guardado en ${ruta}. Escribe /resumen-ver para copiarlo en una sesión nueva.`,
    guardado: ruta => `Resumen guardado en ${ruta}.`,
    noGuardado: (ruta, err) =>
      `No se pudo guardar el resumen en ${ruta} (${err}). Sigue disponible en esta sesión con /resumen-ver.`,
    fallo: motivo => `No se pudo generar el resumen de traspaso (${motivo}).`,
    reintento: 'No se ha perdido nada: se reintentará en tu próximo mensaje. También puedes usar /resumen.',
    rendido: 'No se ha perdido nada. Usa /resumen para reintentarlo cuando quieras.',
    parcial: 'Resumen parcial, solo con los datos de herramientas:',
    conservado: ruta => `El último resumen guardado sigue en ${ruta}.`,
    contexto: h => `[resumen-sesion] Resumen de traspaso de la sesión (generado al volver tras ${h} h sin actividad):`,
    contextoParcial:
      '[resumen-sesion] El modelo no pudo resumir la sesión. Resumen parcial con los datos de herramientas:',
    ver: (ruta, fecha) => `Último resumen guardado (${fecha}) en ${ruta}.`,
    verMemoria: ruta => `No se pudo leer ${ruta}; este es el último resumen de esta sesión.`,
    nada: ruta => `Todavía no hay ningún resumen guardado (${ruta}). Escribe /resumen para generarlo.`,
    motivo: {
      api: s => `error de la API${s ? ` ${s}` : ''}`,
      vacia: 'respuesta vacía',
      abortada: 'tiempo agotado o llamada cancelada',
      excepcion: m => `error: ${m}`,
    },
    descResumen: 'Genera ahora el resumen de traspaso de la sesión y lo guarda',
    descVer: 'Muestra el último resumen de traspaso guardado, listo para copiar',
  },
  en: {
    listoAuto: (h, ruta) =>
      `Handover summary ready after ${h} h of inactivity. Saved to ${ruta}. Type /resumen-ver to copy it into a new session.`,
    guardado: ruta => `Summary saved to ${ruta}.`,
    noGuardado: (ruta, err) => `Could not save the summary to ${ruta} (${err}). It is still available in this session with /resumen-ver.`,
    fallo: motivo => `Could not generate the handover summary (${motivo}).`,
    reintento: 'Nothing was lost: it will try again on your next message. You can also use /resumen.',
    rendido: 'Nothing was lost. Use /resumen to try again whenever you want.',
    parcial: 'Partial summary, with the tool data only:',
    conservado: ruta => `The last saved summary is still in ${ruta}.`,
    contexto: h => `[resumen-sesion] Handover summary of the session (generated on return after ${h} h of inactivity):`,
    contextoParcial: '[resumen-sesion] The model could not summarize the session. Partial summary with the tool data:',
    ver: (ruta, fecha) => `Last saved summary (${fecha}) in ${ruta}.`,
    verMemoria: ruta => `Could not read ${ruta}; this is the last summary from this session.`,
    nada: ruta => `No summary saved yet (${ruta}). Type /resumen to generate one.`,
    motivo: {
      api: s => `API error${s ? ` ${s}` : ''}`,
      vacia: 'empty reply',
      abortada: 'timed out or cancelled',
      excepcion: m => `error: ${m}`,
    },
    descResumen: 'Generate the session handover summary now and save it',
    descVer: 'Show the last saved handover summary, ready to copy',
  },
}

// Opciones de userConfig. register() las fija al cargar; un cambio recarga el módulo.
let cfg: Config = CONFIG_DEFAULT

const errorText = (err: unknown): string => (err instanceof Error ? err.message : String(err))

// Carpeta de datos: "~" es USERPROFILE en Windows y HOME en macOS y Linux. Sin ninguna de las
// dos, la carpeta datos dentro del propio plugin.
async function carpeta($: Ctx): Promise<string> {
  let home: string | undefined
  try {
    home = (await $.env.get('USERPROFILE')) || (await $.env.get('HOME')) || undefined
  } catch {
    home = undefined
  }
  return expandir(cfg.dataDir, home) ?? expandir(DATA_DIR_DEFAULT, home) ?? unir($.plugin.root, 'datos')
}

type Generado =
  | { ok: true; texto: string; ruta: string; errorGuardado?: string }
  | { ok: false; texto: string; ruta: string; motivo: string }

// Genera el resumen. Si el modelo responde, lo guarda en el archivo y en el estado. Si no,
// devuelve un resumen parcial (solo datos de herramientas) y no toca lo ya guardado.
async function generar($: Ctx, origen: Meta['origen']): Promise<Generado> {
  const ui = UI[cfg.idioma]
  let msgs: readonly Mensaje[] = []
  try {
    const m = await $.session.messages()
    if (Array.isArray(m)) msgs = m as readonly Mensaje[]
  } catch {
    msgs = []
  }
  const datos = extraerDatos(msgs)
  const prompt = construirPrompt(cfg.idioma, historial(msgs, cfg.idioma), datos)

  let respuesta: string | null = null
  let motivo = ''
  try {
    const r = await $.model.complete({ model: MODELO, prompt, maxTokens: cfg.maxTokens, timeoutMs: TIMEOUT_MS })
    if (r.isAnswered) respuesta = r.text
    else if (r.reason === 'api-error') motivo = ui.motivo.api(r.status === null ? '' : String(r.status))
    else if (r.reason === 'empty-reply') motivo = ui.motivo.vacia
    else motivo = ui.motivo.abortada
  } catch (err) {
    motivo = ui.motivo.excepcion(errorText(err))
  }
  const partes = respuesta === null ? null : parsear(respuesta)
  if (respuesta !== null && partes === null) motivo = ui.motivo.vacia

  const fecha = fechaTexto(await $.clock.now())
  const texto = formatear(cfg.idioma, partes, datos, { fecha, origen }, cfg.includeFiles)
  const dir = await carpeta($)
  const ruta = unir(dir, ARCHIVO)
  if (partes === null) return { ok: false, texto, ruta, motivo }

  await update($, ultimo, () => ({ texto, fecha, ruta }))
  await update($, fallos, () => 0)
  try {
    await $.fs.write(ruta, `${texto}\n`)
    return { ok: true, texto, ruta }
  } catch (err) {
    return { ok: true, texto, ruta, errorGuardado: errorText(err) }
  }
}

export const register: Register = (on, options) => {
  cfg = leerConfig(options)

  on('session.start', async ($, e, next) => {
    const ui = UI[cfg.idioma]
    try {
      await $.command.register({ name: 'resumen', description: ui.descResumen })
      await $.command.register({ name: 'resumen-ver', description: ui.descVer })
    } catch {
      // Sin comandos, el disparador automático sigue funcionando.
    }
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const now = await $.clock.now()
    await update($, lastAt, () => now)
    return next(e)
  })

  // Disparador automático: solo al enviar un mensaje (el mod no se ejecuta mientras la sesión
  // está parada). Se activa tras idleHours sin actividad, o para reintentar un fallo anterior.
  on('prompt.submit', async ($, e, next) => {
    if (e.isMeta || e.command || !e.text.trim()) return next(e)

    const now = await $.clock.now()
    const last = await read($, lastAt)
    const pendientes = await read($, fallos)
    const idle = last > 0 && now - last >= cfg.idleHours * 3_600_000
    if (!idle && pendientes === 0) return next(e)

    const ui = UI[cfg.idioma]
    const horas = last > 0 ? (now - last) / 3_600_000 : 0
    const h = horasTexto(horas, cfg.idioma)
    const g = await generar($, { tipo: 'auto', horas })

    if (g.ok) {
      $.ui.toast(g.errorGuardado ? ui.noGuardado(g.ruta, g.errorGuardado) : ui.listoAuto(h, g.ruta), { timeoutMs: 10_000 })
      $.ui.log(`${g.errorGuardado ? ui.noGuardado(g.ruta, g.errorGuardado) : ui.guardado(g.ruta)}\n\n${sugerencia(cfg.idioma, g.texto)}`)
      return next({ ...e, context: [...(e.context ?? []), `${ui.contexto(h)}\n${g.texto}`] })
    }

    const intentos = pendientes + 1
    await update($, fallos, () => (intentos >= MAX_INTENTOS ? 0 : intentos))
    const aviso = `${ui.fallo(g.motivo)} ${intentos >= MAX_INTENTOS ? ui.rendido : ui.reintento}`
    $.ui.toast(aviso, { timeoutMs: 10_000 })
    $.ui.log(aviso)
    return next({ ...e, context: [...(e.context ?? []), `${ui.contextoParcial}\n${g.texto}`] })
  }).catch(($, e, next) => next(e))

  // Disparador bajo demanda.
  on('command.run', { command: 'resumen' }, async $ => {
    const ui = UI[cfg.idioma]
    const g = await generar($, { tipo: 'manual' })
    if (g.ok) {
      const cabecera = g.errorGuardado ? ui.noGuardado(g.ruta, g.errorGuardado) : ui.guardado(g.ruta)
      return { text: `${cabecera}\n\n${sugerencia(cfg.idioma, g.texto)}` }
    }
    const aviso = `${ui.fallo(g.motivo)} ${ui.rendido}`
    $.ui.toast(aviso, { timeoutMs: 10_000 })
    const previo = await read($, ultimo)
    const lineas = previo ? [aviso, ui.conservado(previo.ruta)] : [aviso]
    return { text: [...lineas, '', ui.parcial, '', g.texto].join('\n') }
  })

  // Muestra el último resumen guardado: del archivo, o de la copia de esta sesión.
  on('command.run', { command: 'resumen-ver' }, async $ => {
    const ui = UI[cfg.idioma]
    const ruta = unir(await carpeta($), ARCHIVO)
    let texto: string | null = null
    try {
      texto = (await $.fs.read(ruta)).trim() || null
    } catch {
      texto = null
    }
    if (texto) {
      const fecha = /^(?:Fecha|Date): (.+)$/m.exec(texto)?.[1] ?? '?'
      return { text: `${ui.ver(ruta, fecha)}\n\n${sugerencia(cfg.idioma, texto)}` }
    }
    const previo = await read($, ultimo)
    if (previo) return { text: `${ui.verMemoria(ruta)}\n\n${sugerencia(cfg.idioma, previo.texto)}` }
    return { text: ui.nada(ruta) }
  })

  // Dibujo monocromo de la salida de /resumen y /resumen-ver: el texto es el mismo (se copia
  // igual); solo cambian los tonos y el separador gris encima de cada sección.
  for (const command of ['resumen', 'resumen-ver']) {
    on('ui.render', { component: 'CommandOutput', props: { command } }, async ($, e, next) => {
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
}
