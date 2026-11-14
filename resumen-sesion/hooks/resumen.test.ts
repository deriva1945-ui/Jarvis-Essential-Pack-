import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import { extraerDatos, formatear, leerConfig, parsear } from './resumen'
import type { Mensaje } from './resumen'

const H = 3_600_000
const RUTA = '/u/CLAUDE/resumen-sesion/ultimo-resumen.md'

// Conversación de prueba con herramientas: ediciones (una repetida y una fallida), comandos
// relevantes y triviales, y errores.
const MSGS: Mensaje[] = [
  { role: 'user', text: 'Quiero añadir caché al cliente HTTP.', toolUses: [] },
  {
    role: 'assistant',
    text: 'Uso un Map con TTL de 60 s.',
    toolUses: [
      { tool: 'Read', input: { file_path: '/repo/src/leido.ts' }, text: 'ok' },
      { tool: 'Edit', input: { file_path: '/repo/src/cache.ts' }, text: 'ok' },
      { tool: 'Write', input: { file_path: '/repo/src/cache.test.ts' }, text: 'ok' },
      { tool: 'Edit', input: { file_path: '/repo/src/cache.ts' }, text: 'ok' },
      { tool: 'Edit', input: { file_path: '/repo/src/fallido.ts' }, text: 'String not found', isError: true },
      { tool: 'Bash', input: { command: 'ls -la' }, text: '' },
      { tool: 'Bash', input: { command: 'cd /repo && pwd' }, text: '' },
      { tool: 'Bash', input: { command: 'npm test' }, text: '1 failing', isError: true },
      { tool: 'Bash', input: { command: 'npm run build' }, text: 'ok' },
    ],
  },
  { role: 'user', text: 'Vale, sigue mañana con la invalidación.', toolUses: [] },
]

const RESPUESTA = [
  '## Objetivo',
  'Añadir caché al cliente HTTP.',
  '## Decisiones tomadas',
  '- Map con TTL de 60 s.',
  '## Pendientes',
  '- Invalidación de la caché.',
].join('\n')

type Ask = { model: string; prompt: string; maxTokens?: number }
type Modelo = (e: Ask) => unknown

// Lo que la sesión responde por debajo del mod. Devuelve lo que el mod hizo.
function base(on: On, modelo: Modelo = () => ({ value: { isAnswered: true, text: RESPUESTA, usage: USAGE } }), writeFails = false) {
  const files = new Map<string, string>()
  const asks: Ask[] = []
  const toasts: string[] = []
  const logs: string[] = []
  const submits: { text: string; context?: readonly string[] }[] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('env.get', (_, e) => ({ value: e.name === 'HOME' ? '/u' : undefined }))
  on('session.messages', () => ({ value: MSGS as never }))
  on('model.complete', (_, e) => {
    asks.push(e)
    return modelo(e) as never
  })
  on('fs.write', (_, e) => {
    if (writeFails) return { deny: 'disco lleno' }
    files.set(e.path, e.text)
    return { value: undefined }
  })
  on('fs.read', (_, e) => {
    const t = files.get(e.path)
    if (t === undefined) throw new Error('ENOENT')
    return { value: t }
  })
  on('ui.toast', (_, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('ui.log', (_, e) => {
    logs.push(e.text)
    return { value: undefined }
  })
  on('turn.complete', () => ({ text: '' }))
  on('prompt.submit', (_, e) => {
    submits.push({ text: e.text, context: e.context })
    return { text: e.text, context: e.context }
  })
  return { files, asks, toasts, logs, submits }
}

const USAGE = { input_tokens: 10, output_tokens: 10, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
const TURN = { answer: '', durationMs: 1, isAborted: false, reason: 'answer', turnId: 't', usage: { model: 'm', ...USAGE } } as const
const cmd = (command: string) => ({ command, args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } }) as const
const msg = (text: string) => ({ text, wait: false, origin: { kind: 'composer' } }) as const
const ERROR_API = () => ({ value: { isAnswered: false, reason: 'api-error', status: 529, error: 'overloaded_error', usage: USAGE } })

const SECCIONES_ES = ['## Objetivo', '## Decisiones tomadas', '## Archivos tocados', '## Comandos ejecutados', '## Errores vistos', '## Pendientes']

const enOrden = (texto: string, partes: string[]) => {
  const pos = partes.map(p => texto.indexOf(p))
  expect(pos.every(p => p >= 0)).toBe(true)
  expect([...pos].sort((a, b) => a - b)).toEqual(pos)
}

// ---------- Secciones ----------

test('extraerDatos: unique files touched, relevant commands and errors from the tool data', () => {
  const d = extraerDatos(MSGS)
  expect(d.archivos).toEqual(['/repo/src/cache.ts', '/repo/src/cache.test.ts'])
  // Read no cuenta como tocado y una edición fallida tampoco.
  expect(d.archivos).not.toContain('/repo/src/leido.ts')
  expect(d.archivos).not.toContain('/repo/src/fallido.ts')
  // ls y "cd && pwd" son triviales; el fallido va a errores.
  expect(d.comandos).toEqual(['npm run build'])
  expect(d.errores).toEqual(['Edit: String not found', 'Bash: 1 failing'])
})

test('formatear: the six fixed sections in order, with the model parts and the tool data', () => {
  const d = extraerDatos(MSGS)
  const t = formatear('es', parsear(RESPUESTA), d, { fecha: '2026-11-12 10:00 (UTC+00:00)', origen: { tipo: 'manual' } }, true)
  enOrden(t, SECCIONES_ES)
  expect(t).toContain('Fecha: 2026-11-12 10:00 (UTC+00:00)')
  expect(t).toContain('Añadir caché al cliente HTTP.')
  expect(t).toContain('- Map con TTL de 60 s.')
  expect(t).toContain('- /repo/src/cache.ts')
  expect(t).toContain('- `npm run build`')
  expect(t).toContain('- Bash: 1 failing')
  expect(t).toContain('- Invalidación de la caché.')
})

test('formatear: English headings, and no files section when includeFiles is off', () => {
  const t = formatear('en', parsear('## Goal\nShip it\n## Decisions made\n- a\n## Pending\n- b'), extraerDatos(MSGS), { fecha: 'f', origen: { tipo: 'auto', horas: 2.5 } }, false)
  enOrden(t, ['## Goal', '## Decisions made', '## Commands run', '## Errors seen', '## Pending'])
  expect(t).not.toContain('Files touched')
  expect(t).not.toContain('/repo/src/cache.ts')
  expect(t).toContain('automatic, after 2.5 h of inactivity')
  expect(t).toContain('Ship it')
})

test('parsear: bold or colon headings, unknown sections dropped, text without headings goes to the goal', () => {
  const p = parsear('**Objetivo**\nA\n**Decisiones**:\n- B\n## Archivos tocados\n- inventado.ts\nPendientes:\n- C')
  expect(p).toEqual({ objetivo: 'A', decisiones: '- B', pendientes: '- C' })
  expect(parsear('Solo una frase.')).toEqual({ objetivo: 'Solo una frase.', decisiones: '', pendientes: '' })
  expect(parsear('   ')).toBe(null)
})

test('leerConfig: defaults and limits for the userConfig options', () => {
  expect(leerConfig({})).toEqual({ idleHours: 2, maxTokens: 800, includeFiles: true, idioma: 'es', dataDir: '~/CLAUDE/resumen-sesion' })
  const c = leerConfig({ idleHours: 0.5, maxTokens: 99999, includeFiles: false, language: 'en', dataDir: '/datos' })
  expect(c).toEqual({ idleHours: 0.5, maxTokens: 8000, includeFiles: false, idioma: 'en', dataDir: '/datos' })
  expect(leerConfig({ idleHours: -1, maxTokens: 10, language: 'fr' })).toMatchObject({ idleHours: 2, maxTokens: 200, idioma: 'es' })
})

// ---------- Disparador automático ----------

test('auto: after 2 h idle the next message gets the summary in context, saved to the file, with a suggestion', async ($, on) => {
  const clock = mock.clock(on, { now: 10 * H })
  const s = base(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.turn.complete(TURN)

  await clock.advance(2 * H + 60_000)
  await $.prompt.submit(msg('hola de nuevo'))

  expect(s.asks).toHaveLength(1)
  expect(s.asks[0]?.model).toBe('haiku')
  expect(s.asks[0]?.maxTokens).toBe(800)
  expect(s.asks[0]?.prompt).toContain('/repo/src/cache.ts')
  expect(s.asks[0]?.prompt).toContain('Usuario: Quiero añadir caché')

  const ctx = s.submits.at(-1)?.context?.join('\n') ?? ''
  expect(ctx).toContain('[resumen-sesion]')
  expect(ctx).toContain('2 h sin actividad')
  enOrden(ctx, SECCIONES_ES)

  const guardado = s.files.get(RUTA) ?? ''
  enOrden(guardado, SECCIONES_ES)
  expect(guardado).toMatch(/^Fecha: \d{4}-\d{2}-\d{2} \d{2}:\d{2} \(UTC[+-]\d{2}:\d{2}\)$/m)
  expect(guardado).toContain('automático, tras 2 h sin actividad')

  // Sugerencia: aviso breve y el texto listo para copiar en el registro.
  expect(s.toasts.at(-1)).toContain('/resumen-ver')
  expect(s.toasts.at(-1)).toContain(RUTA)
  const log = s.logs.at(-1) ?? ''
  expect(log).toContain('empieza una sesión nueva')
  expect(log).toContain('──── copiar desde aquí ────')
  expect(log).toContain('──── copiar hasta aquí ────')
  expect(log).toContain('## Pendientes')
})

test('auto: nothing before the threshold, on the first message, or without a new message', async ($, on) => {
  const clock = mock.clock(on, { now: 10 * H })
  const s = base(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  // Primer mensaje: aún no hay ningún turno terminado.
  await $.prompt.submit(msg('primero'))
  await $.turn.complete(TURN)
  await clock.advance(2 * H - 60_000)
  await $.prompt.submit(msg('casi dos horas'))
  expect(s.asks).toHaveLength(0)
  // Pasan horas sin escribir: el mod no hace nada por su cuenta (limitación documentada).
  await $.turn.complete(TURN)
  await clock.advance(5 * H)
  expect(s.asks).toHaveLength(0)
  expect(s.files.size).toBe(0)
  expect(s.submits.every(x => !(x.context ?? []).join('').includes('[resumen-sesion]'))).toBe(true)
})

test('auto: idleHours, maxTokens and language come from userConfig', { options: { idleHours: 0.5, maxTokens: 1500, language: 'en' } }, async ($, on) => {
  const clock = mock.clock(on, { now: 10 * H })
  const s = base(on, () => ({ value: { isAnswered: true, text: '## Goal\nG\n## Decisions made\n- D\n## Pending\n- P', usage: USAGE } }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.turn.complete(TURN)
  await clock.advance(31 * 60_000)
  await $.prompt.submit(msg('back'))

  expect(s.asks).toHaveLength(1)
  expect(s.asks[0]?.maxTokens).toBe(1500)
  expect(s.asks[0]?.prompt).toContain('Answer in English')
  const t = s.files.get(RUTA) ?? ''
  enOrden(t, ['## Goal', '## Decisions made', '## Files touched', '## Commands run', '## Errors seen', '## Pending'])
  expect(t).toContain('Date: ')
  expect(s.logs.at(-1)).toContain('──── copy from here ────')
})

test('includeFiles off: the summary has no files section', { options: { includeFiles: false } }, async ($, on) => {
  mock.clock(on, { now: 10 * H })
  const s = base(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const { text } = await $.command.run(cmd('resumen'))
  expect(text).not.toContain('Archivos tocados')
  expect(s.files.get(RUTA)).not.toContain('/repo/src/cache.ts')
  expect(text).toContain('## Comandos ejecutados')
})

test('dataDir: the summary goes to the configured folder', { options: { dataDir: '/datos/resumenes' } }, async ($, on) => {
  mock.clock(on, { now: 10 * H })
  const s = base(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const { text } = await $.command.run(cmd('resumen'))
  expect(s.files.has('/datos/resumenes/ultimo-resumen.md')).toBe(true)
  expect(text).toContain('Resumen guardado en /datos/resumenes/ultimo-resumen.md.')
})

// ---------- Disparador bajo demanda y /resumen-ver ----------

test('/resumen: generates now, saves it and returns the suggestion with the text to copy', async ($, on) => {
  mock.clock(on, { now: 10 * H })
  const s = base(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const { text } = await $.command.run(cmd('resumen'))

  expect(s.asks).toHaveLength(1)
  expect(text).toContain(`Resumen guardado en ${RUTA}.`)
  expect(text).toContain('pega este texto como primer mensaje')
  expect(text).toContain('Retomo una sesión anterior.')
  enOrden(text ?? '', ['──── copiar desde aquí ────', ...SECCIONES_ES, '──── copiar hasta aquí ────'])
  expect(s.files.get(RUTA)).toContain('bajo demanda (/resumen)')
})

test('/resumen-ver: shows the saved file with its date, or says there is none yet', async ($, on) => {
  mock.clock(on, { now: 10 * H })
  const s = base(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const vacio = await $.command.run(cmd('resumen-ver'))
  expect(vacio.text).toContain('Todavía no hay ningún resumen guardado')
  expect(vacio.text).toContain('/resumen')

  // Un archivo de una sesión anterior: se lee aunque esta sesión no haya generado nada.
  s.files.set(RUTA, '# Resumen de traspaso\nFecha: 2026-11-01 09:00 (UTC+01:00)\n\n## Objetivo\nViejo')
  const { text } = await $.command.run(cmd('resumen-ver'))
  expect(text).toContain(`Último resumen guardado (2026-11-01 09:00 (UTC+01:00)) en ${RUTA}.`)
  expect(text).toContain('Viejo')
  expect(text).toContain('──── copiar desde aquí ────')
  expect(s.asks).toHaveLength(0)
})

// ---------- Degradación ----------

test('degradation: /resumen with the model failing keeps the last saved summary and warns', async ($, on) => {
  mock.clock(on, { now: 10 * H })
  let falla = false
  const s = base(on, () => (falla ? ERROR_API() : { value: { isAnswered: true, text: RESPUESTA, usage: USAGE } }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.command.run(cmd('resumen'))
  const antes = s.files.get(RUTA)

  falla = true
  const { text } = await $.command.run(cmd('resumen'))
  expect(text).toContain('No se pudo generar el resumen de traspaso (error de la API 529).')
  expect(text).toContain(`El último resumen guardado sigue en ${RUTA}.`)
  // Resumen parcial: datos de herramientas completos y las partes del modelo marcadas.
  expect(text).toContain('- /repo/src/cache.ts')
  expect(text).toContain('(no disponible: el modelo no respondió)')
  expect(s.files.get(RUTA)).toBe(antes)
  expect(s.toasts.at(-1)).toContain('No se pudo generar')

  const ver = await $.command.run(cmd('resumen-ver'))
  expect(ver.text).toContain('Añadir caché al cliente HTTP.')
})

test('degradation: a failed automatic summary warns, adds the partial data, retries once on the next message, then stops', async ($, on) => {
  const clock = mock.clock(on, { now: 10 * H })
  const s = base(on, ERROR_API)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.turn.complete(TURN)
  await clock.advance(3 * H)

  await $.prompt.submit(msg('vuelvo'))
  expect(s.asks).toHaveLength(1)
  expect(s.toasts.at(-1)).toContain('se reintentará en tu próximo mensaje')
  const ctx = s.submits.at(-1)?.context?.join('\n') ?? ''
  expect(ctx).toContain('Resumen parcial')
  expect(ctx).toContain('- /repo/src/cache.ts')
  expect(s.files.size).toBe(0)

  // Siguiente mensaje sin inactividad: reintenta una vez.
  await $.turn.complete(TURN)
  await $.prompt.submit(msg('otra'))
  expect(s.asks).toHaveLength(2)
  expect(s.toasts.at(-1)).toContain('Usa /resumen para reintentarlo')

  // Tras el segundo fallo no insiste.
  await $.turn.complete(TURN)
  await $.prompt.submit(msg('y otra'))
  expect(s.asks).toHaveLength(2)
})

test('degradation: the retry succeeds on the next message and saves the summary', async ($, on) => {
  const clock = mock.clock(on, { now: 10 * H })
  let n = 0
  const s = base(on, () => (++n === 1 ? ERROR_API() : { value: { isAnswered: true, text: RESPUESTA, usage: USAGE } }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.turn.complete(TURN)
  await clock.advance(3 * H)
  await $.prompt.submit(msg('vuelvo'))
  await $.turn.complete(TURN)
  await $.prompt.submit(msg('otra'))
  expect(s.asks).toHaveLength(2)
  enOrden(s.files.get(RUTA) ?? '', SECCIONES_ES)
})

test('degradation: a model call that throws, or a file that cannot be written, never loses the summary', async ($, on) => {
  mock.clock(on, { now: 10 * H })
  let lanza = true
  const s = base(on, () => (lanza ? { deny: 'bloqueado' } : { value: { isAnswered: true, text: RESPUESTA, usage: USAGE } }), true)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const a = await $.command.run(cmd('resumen'))
  expect(a.text).toContain('No se pudo generar el resumen de traspaso (error:')

  lanza = false
  const b = await $.command.run(cmd('resumen'))
  expect(b.text).toContain(`No se pudo guardar el resumen en ${RUTA}`)
  expect(b.text).toContain('──── copiar desde aquí ────')
  // /resumen-ver usa la copia de esta sesión si el archivo no se puede leer.
  const ver = await $.command.run(cmd('resumen-ver'))
  expect(ver.text).toContain(`No se pudo leer ${RUTA}`)
  expect(ver.text).toContain('Añadir caché al cliente HTTP.')
  expect(s.files.size).toBe(0)
})

// ---------- Presentación ----------

const GRISES = ['#ffffff', '#d4d4d4', '#a3a3a3', '#737373']

test('/resumen y /resumen-ver se dibujan en blanco y grises, con separadores grises entre secciones', async ($, on) => {
  mock.clock(on, { now: 10 * H })
  base(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const { text } = await $.command.run(cmd('resumen'))

  for (const command of ['resumen', 'resumen-ver'] as const) {
    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({
        plugin: 'resumen-sesion',
        surface,
        component: 'CommandOutput',
        props: { command, args: '', text: text ?? '', isErrored: false },
      })
      const textos = await ui.findAll({ type: 'Text' })
      for (const t of textos) if (t.props.color !== undefined) expect(GRISES).toContain(t.props.color)
      // El tramo más interior que coincide: el que lleva el tono.
      const tono = async (re: RegExp) => (await ui.findAll({ type: 'Text', text: re })).at(-1)?.props
      expect((await tono(/^Resumen guardado en /))?.color).toBe('#ffffff')
      expect(await tono(/^# Resumen de traspaso$/)).toMatchObject({ color: '#ffffff', weight: 'bold' })
      expect(await tono(/^Objetivo$/)).toMatchObject({ color: '#ffffff', weight: 'bold' })
      expect((await tono(/^## $/))?.color).toBe('#a3a3a3')
      expect((await tono(/^──── copiar desde aquí ────$/))?.color).toBe('#a3a3a3')
      expect((await tono(/pega este texto como primer mensaje/))?.color).toBe('#d4d4d4')
      const separadores = (await ui.findAll({ type: 'Text', text: /^─{40}$/ })).filter(t => t.props.color === '#a3a3a3')
      expect(separadores).toHaveLength(SECCIONES_ES.length)
      await ui.unmount()
    }
  }
})
