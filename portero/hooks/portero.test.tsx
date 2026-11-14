import type { On, SessionMessage } from 'claude-code'
import { type Engine, expect, test } from 'claude-code/testing'

type Captured = { text: string; context: readonly string[] }

const ORIGIN = { kind: 'composer' } as const
const LOG = '/prueba/portero/decisiones.jsonl'

// Prepara los hooks que hacen de motor: disco en memoria, transcript, clasificador y el
// final de prompt.submit, que guarda lo que llega al modelo.
function motor(
  on: On,
  opts: { classify?: () => string | undefined; messages?: SessionMessage[]; files?: Map<string, string>; home?: string } = {},
) {
  const files = opts.files ?? new Map<string, string>()
  const seen: Captured[] = []
  const classified: string[] = []
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('env.get', (_, e) => ({ value: e.name === 'HOME' ? opts.home : undefined }))
  on('fs.exists', (_, e) => ({ value: files.has(e.path) }))
  on('fs.read', (_, e) => {
    const v = files.get(e.path)
    if (v === undefined) throw new Error('ENOENT')
    return { value: v }
  })
  on('fs.write', (_, e) => {
    files.set(e.path, e.text)
    return { value: undefined }
  })
  on('ui.status', () => ({ value: undefined }))
  on('session.messages', () => ({ value: opts.messages ?? [] }))
  on('model.classify', (_, e) => {
    classified.push(e.text)
    if (!opts.classify) throw new Error('sin clasificador en este test')
    return { value: opts.classify() }
  })
  on('prompt.submit', (_, e) => {
    seen.push({ text: e.text, context: e.context ?? [] })
    return { text: e.text, context: e.context }
  })
  return { files, seen, classified }
}

const OPTS = { options: { dataDir: '/prueba/portero' } }

type E = Engine
const enviar = ($: E, text: string) => $.prompt.submit({ text, wait: false, origin: ORIGIN })
const ultima = (files: Map<string, string>) => {
  const lines = (files.get(LOG) ?? '').trim().split('\n')
  return JSON.parse(lines.at(-1)!) as Record<string, unknown>
}
const portero = ($: E, args = '') =>
  $.command.run({ command: 'portero', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } })

// ---------------------------------------------------------------- capa de reglas

test('regla de longitud: más de heavyLength caracteres va a pesada sin preguntar al modelo', OPTS, async ($, on) => {
  const m = motor(on)
  await enviar($, 'hola '.repeat(130))
  expect(m.classified).toHaveLength(0)
  expect(m.seen[0]!.context.join('\n')).toContain('Tarea PESADA')
  expect(ultima(m.files)).toMatchObject({ ruta: 'pesada', capa: 'regla', motivo: 'longitud' })
})

test('el umbral de longitud es configurable', { options: { dataDir: '/prueba/portero', heavyLength: 20, lightLength: 10 } }, async ($, on) => {
  const m = motor(on)
  await enviar($, 'una petición de más de veinte letras')
  expect(ultima(m.files)).toMatchObject({ motivo: 'longitud' })
})

test('regla de bloque de código', OPTS, async ($, on) => {
  const m = motor(on)
  await enviar($, 'mira esto\n```\nconst a = 1\n```')
  expect(ultima(m.files)).toMatchObject({ ruta: 'pesada', motivo: 'codigo' })
})

test('regla de ruta de archivo', OPTS, async ($, on) => {
  const m = motor(on)
  await enviar($, 'cambia src/app/main.ts por favor')
  expect(ultima(m.files)).toMatchObject({ ruta: 'pesada', motivo: 'ruta-archivo' })
})

test('palabras clave pesadas y ligeras', OPTS, async ($, on) => {
  const m = motor(on)
  await enviar($, 'depura el login, se cuelga')
  expect(ultima(m.files)).toMatchObject({ ruta: 'pesada', motivo: 'palabra-pesada:depuracion' })
  await enviar($, 'traduce "hola" al inglés')
  expect(ultima(m.files)).toMatchObject({ ruta: 'ligera', motivo: 'palabra-ligera:traduccion' })
  expect(m.seen[1]!.context.join('\n')).toContain('Tarea LIGERA')
  expect(m.classified).toHaveLength(0)
})

test('una regla desactivada no dispara y el caso pasa al modelo', { options: { dataDir: '/prueba/portero', rulePaths: false } }, async ($, on) => {
  const m = motor(on, { classify: () => 'ligera' })
  await enviar($, 'cambia src/app/main.ts por favor')
  expect(m.classified).toHaveLength(1)
  expect(ultima(m.files)).toMatchObject({ ruta: 'ligera', capa: 'modelo', motivo: 'modelo:ligera' })
})

test('historial: un seguimiento corto tras una pesada sigue en pesada', OPTS, async ($, on) => {
  const m = motor(on, { classify: () => 'ligera' })
  await enviar($, 'refactoriza el módulo de pagos')
  await enviar($, 'y ahora los tests')
  expect(ultima(m.files)).toMatchObject({ ruta: 'pesada', capa: 'historial', motivo: 'historial:seguimiento' })
  expect(m.classified).toHaveLength(0)
})

test('sin historial pesado, el mismo seguimiento lo decide el modelo', OPTS, async ($, on) => {
  const m = motor(on, { classify: () => 'ligera' })
  await enviar($, 'y ahora los tests')
  expect(m.classified).toHaveLength(1)
  expect(ultima(m.files)).toMatchObject({ ruta: 'ligera', capa: 'modelo' })
})

// ---------------------------------------------------------------- capa de modelo y degradación

test('el modelo decide los dudosos; "dudosa" va por la ruta pesada', OPTS, async ($, on) => {
  const m = motor(on, { classify: () => 'dudosa' })
  await enviar($, 'hazme un plan para mañana')
  expect(ultima(m.files)).toMatchObject({ ruta: 'dudosa', capa: 'modelo', motivo: 'modelo:dudosa' })
  expect(m.seen[0]!.context.join('\n')).toContain('DUDOSA')
  expect(m.seen[0]!.context.join('\n')).toContain('model "opus"')
})

test('si el clasificador falla, la ruta es pesada y se registra un aviso', OPTS, async ($, on) => {
  const m = motor(on)
  await enviar($, 'hazme un plan para mañana')
  const e = ultima(m.files)
  expect(e).toMatchObject({ ruta: 'pesada', capa: 'fallo', motivo: 'fallo-clasificador' })
  expect(String(e['aviso'])).toContain('clasificador no disponible')
  expect(m.seen[0]!.context.join('\n')).toContain('Tarea PESADA')
})

test('el modelo pesado es configurable (fable)', { options: { dataDir: '/prueba/portero', heavyModel: 'fable' } }, async ($, on) => {
  const m = motor(on)
  await enviar($, '!pesada revisa esto')
  expect(m.seen[0]!.context.join('\n')).toContain('model "fable"')
})

// ---------------------------------------------------------------- overrides

test('overrides !pesada, !ligera y !dudosa quitan el atajo del texto', OPTS, async ($, on) => {
  const m = motor(on, { messages: [{ role: 'user', text: 'contexto previo importante', toolUses: [] }] })
  await enviar($, '!ligera depura todo el proyecto')
  expect(m.seen[0]!.text).toBe('depura todo el proyecto')
  expect(ultima(m.files)).toMatchObject({ ruta: 'ligera', capa: 'override', motivo: 'override:!ligera' })
  await enviar($, '!pesada qué es un monad')
  expect(ultima(m.files)).toMatchObject({ ruta: 'pesada', motivo: 'override:!pesada' })
  await enviar($, '!dudosa qué es un monad')
  expect(ultima(m.files)).toMatchObject({ ruta: 'dudosa', motivo: 'override:!dudosa' })
  expect(m.seen[2]!.context.join('\n')).toContain('contexto previo importante')
  expect(m.classified).toHaveLength(0)
})

// ---------------------------------------------------------------- contexto a subagentes

const LARGO = (c: string) => c.repeat(300)
const HISTORIA: SessionMessage[] = [
  { role: 'user', text: LARGO('a'), toolUses: [] },
  { role: 'assistant', text: 'ok', toolUses: [] },
  { role: 'user', text: LARGO('b'), toolUses: [] },
  { role: 'assistant', text: '', toolUses: [{ id: 't1', name: 'Bash', input: {} }] as unknown as SessionMessage['toolUses'] },
  { role: 'user', text: LARGO('c'), toolUses: [] },
  { role: 'assistant', text: LARGO('d'), toolUses: [] },
]

test('contexto: limitado por mensajes y caracteres, sin vacíos ni confirmaciones', { options: { dataDir: '/prueba/portero', contextMessages: 2, contextChars: 1000 } }, async ($, on) => {
  const m = motor(on, { messages: HISTORIA })
  await enviar($, '!pesada sigue')
  const ctx = m.seen[0]!.context.join('\n')
  expect(ctx).toContain('ccc')
  expect(ctx).toContain('ddd')
  expect(ctx).not.toContain('bbb')
  expect(ctx).not.toContain('Asistente: ok')
  const reciente = ctx.slice(ctx.indexOf('Contexto reciente:'))
  expect(reciente.length).toBeLessThan(1100)
})

test('contexto: !dudosa pasa el doble que !pesada', { options: { dataDir: '/prueba/portero', contextMessages: 2, contextChars: 5000 } }, async ($, on) => {
  const m = motor(on, { messages: HISTORIA })
  await enviar($, '!dudosa sigue')
  const ctx = m.seen[0]!.context.join('\n')
  expect(ctx).toContain('aaa')
  expect(ctx).toContain('bbb')
})

test('contexto: contextMessages 0 no pasa mensajes', { options: { dataDir: '/prueba/portero', contextMessages: 0 } }, async ($, on) => {
  const m = motor(on, { messages: HISTORIA })
  await enviar($, '!pesada sigue')
  expect(m.seen[0]!.context.join('\n')).not.toContain('Contexto reciente')
})

// ---------------------------------------------------------------- registro

test('registro: JSON lines con marca de tiempo, texto recortado y secretos tapados', { options: { dataDir: '/prueba/portero', logTextChars: 40 } }, async ($, on) => {
  const m = motor(on)
  await enviar($, '!ligera mi token: sk-abcdefghijklmnopqrstuvwxyz y luego un texto muy largo que no cabe')
  const e = ultima(m.files)
  expect(typeof e['ts']).toBe('string')
  expect(Number.isNaN(Date.parse(String(e['ts'])))).toBe(false)
  expect(String(e['texto']).length).toBeLessThanOrEqual(40)
  expect(String(e['texto'])).not.toContain('sk-abc')
  expect(e).toMatchObject({ ruta: 'ligera', capa: 'override' })
})

test('registro: conserva las entradas previas y recorta a logMaxEntries', { options: { dataDir: '/prueba/portero', logMaxEntries: 10 } }, async ($, on) => {
  const prev = Array.from({ length: 10 }, (_, i) =>
    JSON.stringify({ ts: '2026-01-01T00:00:00.000Z', ruta: 'ligera', capa: 'regla', motivo: `vieja-${i}`, texto: '', longitud: 1 }),
  ).join('\n')
  const m = motor(on, { files: new Map([[LOG, prev + '\nlínea rota\n']]) })
  await enviar($, '!pesada nueva')
  const lines = m.files.get(LOG)!.trim().split('\n')
  expect(lines).toHaveLength(10)
  expect(lines[0]).toContain('vieja-1')
  expect(lines[9]).toContain('override:!pesada')
})

test('registro desactivado: no escribe nada', { options: { dataDir: '/prueba/portero', logEnabled: false } }, async ($, on) => {
  const m = motor(on)
  await enviar($, '!pesada nueva')
  expect(m.files.size).toBe(0)
})

test('los comandos y los mensajes vacíos pasan sin tocar', OPTS, async ($, on) => {
  const m = motor(on)
  await enviar($, '   ')
  expect(m.files.size).toBe(0)
  expect(m.seen[0]!.context).toHaveLength(0)
})

// ---------------------------------------------------------------- comando /portero

test('/portero muestra reparto, reglas que más disparan y últimos casos', OPTS, async ($, on) => {
  const m = motor(on, { classify: () => 'ligera' })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await enviar($, 'depura el login')
  await enviar($, 'depura el registro')
  await enviar($, 'traduce hola')
  await enviar($, 'hazme un plan')
  const { text } = await portero($)
  expect(text).toContain('4 decisiones registradas')
  expect(text).toContain('Reparto de rutas:')
  expect(text).toMatch(/pesada\s+2\s+50%/)
  expect(text).toMatch(/ligera\s+2\s+50%/)
  expect(text).toMatch(/2 {2}palabra-pesada:depuracion/)
  expect(text).toContain('Últimos casos:')
  expect(text).toContain('hazme un plan')
  expect(text).toContain(LOG)
  expect(m.classified).toHaveLength(1)
})

test('/portero sin registro dice que aún no hay decisiones', OPTS, async ($, on) => {
  motor(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const { text } = await portero($)
  expect(text).toContain('aún no hay decisiones')
})

test('/portero reglas lista las reglas activas y las desactivadas', { options: { dataDir: '/prueba/portero', ruleCode: false, heavyLength: 900 } }, async ($, on) => {
  motor(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const { text } = await portero($, 'reglas')
  expect(text).toContain('[x] longitud         más de 900 caracteres')
  expect(text).toContain('[ ] codigo')
  expect(text).toContain('Modelo pesado: opus')
  const otra = await portero($, 'otra')
  expect(otra.text).toContain('Uso: /portero')
})

test('la carpeta del registro por defecto es ~/CLAUDE/portero', async ($, on) => {
  const m = motor(on, { home: '/home/prueba' })
  await enviar($, '!pesada algo')
  expect([...m.files.keys()]).toEqual(['/home/prueba/CLAUDE/portero/decisiones.jsonl'])
})

// ---------------------------------------------------------------- subagente

test('agent.spawn: tras una pesada, el subagente sin modelo recibe el modelo pesado', OPTS, async ($, on) => {
  motor(on)
  const models: Array<string | undefined> = []
  on('agent.spawn', (_, e) => {
    models.push(e.model)
    return { model: e.model ?? 'session' }
  })
  const spawn = () =>
    $.agent.spawn({
      prompt: 'trabajo',
      description: 'trabajo',
      subagentType: 'general-purpose',
      parentModel: 'haiku',
      background: false,
      fork: false,
    } as unknown as Parameters<typeof $.agent.spawn>[0])
  await enviar($, '!ligera hola')
  await spawn()
  await enviar($, '!pesada refactor')
  await spawn()
  expect(models).toEqual([undefined, 'opus'])
})

// ---------------------------------------------------------------- presentación

const GRISES = ['#ffffff', '#d4d4d4', '#a3a3a3', '#737373']

const salida = (text: string, surface: 'terminal' | 'desktop') =>
  ({
    plugin: 'portero',
    surface,
    component: 'CommandOutput',
    props: { command: 'portero', args: '', text, isErrored: false },
  }) as const

test('/portero se dibuja en blanco y grises, con barras de texto en el reparto', OPTS, async ($, on) => {
  motor(on, { classify: () => 'ligera' })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await enviar($, 'depura el login')
  await enviar($, 'depura el registro')
  await enviar($, 'traduce hola')
  await enviar($, 'hazme un plan')
  const { text } = await portero($)
  expect(text).toMatch(/pesada\s+2\s+50%\s+█{10}░{10}$/m)
  expect(text).toMatch(/ligera\s+2\s+50%\s+█{10}░{10}$/m)
  expect(text).toMatch(/dudosa\s+0\s+0%\s+░{20}$/m)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount(salida(text ?? '', surface))
    for (const t of await ui.findAll({ type: 'Text' })) if (t.props.color !== undefined) expect(GRISES).toContain(t.props.color)
    // El tramo más interior que coincide: el que lleva el tono.
    const tono = async (re: RegExp) => (await ui.findAll({ type: 'Text', text: re })).at(-1)?.props
    expect(await tono(/^portero · 4 decisiones registradas$/)).toMatchObject({ color: '#ffffff', weight: 'bold' })
    expect((await tono(/^Reparto de rutas:$/))?.color).toBe('#a3a3a3')
    expect((await tono(/^█{10}$/))?.color).toBe('#ffffff')
    expect((await tono(/^░{10}$/))?.color).toBe('#a3a3a3')
    expect((await tono(/^Registro:$/))?.color).toBe('#a3a3a3')
    await ui.unmount()
  }

  const reglas = await portero($, 'reglas')
  const ui = await $.ui.mount(salida(reglas.text ?? '', 'terminal'))
  const tono = async (re: RegExp) => (await ui.findAll({ type: 'Text', text: re })).at(-1)?.props
  expect((await tono(/^\[x\]$/))?.color).toBe('#ffffff')
  await ui.unmount()
})

test('/portero reglas: las reglas desactivadas en gris', { options: { dataDir: '/prueba/portero', ruleCode: false } }, async ($, on) => {
  motor(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const { text } = await portero($, 'reglas')
  const ui = await $.ui.mount(salida(text ?? '', 'terminal'))
  const tono = async (re: RegExp) => (await ui.findAll({ type: 'Text', text: re })).at(-1)?.props
  expect((await tono(/^\[ \]$/))?.color).toBe('#a3a3a3')
  expect((await tono(/^ codigo$/))?.color).toBe('#a3a3a3')
  expect((await tono(/^ longitud$/))?.color).toBe('#ffffff')
  await ui.unmount()
})
