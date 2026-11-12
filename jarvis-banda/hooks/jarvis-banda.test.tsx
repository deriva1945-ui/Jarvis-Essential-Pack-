import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

const BAND = {
  plugin: 'jarvis-banda',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 9 },
    view: {},
  },
} as const

const SURFACES = ['terminal', 'desktop'] as const

type Linea = { text: string; color: unknown; inverse: unknown } | undefined

// Dibuja la banda en una superficie y devuelve su texto, color y si el símbolo pulsa.
async function linea($: Engine, surface: (typeof SURFACES)[number] = 'terminal'): Promise<Linea> {
  const ui = await $.ui.mount({ ...BAND, surface })
  const found = await ui.find({ type: 'Text', text: /J\.A\.R|ESPERANDO|AWAITING|PROCESANDO|PROCESSING|EJECUTANDO|RUNNING/ })
  const simbolo = await ui.find({ type: 'Text', text: /^[◌◐◓◑◒◈✕]$/ })
  await ui.unmount()
  if (!found) return undefined
  return { text: found.text ?? '', color: found.props.color, inverse: simbolo?.props.inverse }
}

// El motor de debajo: modelo, uso y respuestas por defecto.
function motor(on: On, modelo = 'claude-haiku-5-5', contexto = 42) {
  on('session.model', () => ({ value: modelo }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { window: 200000, tokens: 84000, percent: contexto }, rateLimits: [] },
  }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('turn.complete', () => ({ text: '' }))
  return mock.clock(on)
}

const TURNO = { answer: '', durationMs: 1, isAborted: false, reason: 'answer' } as const
const uso = (model: string) => ({
  model,
  input_tokens: 10,
  output_tokens: 10,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
})

const SPAWN = {
  tool_use_id: 'tu1',
  prompt: 'p',
  description: 'd',
  subagentType: 'Explore',
  provider: { plugin: 'engine', tier: 'core' },
  model: 'opus',
  parentModel: 'claude-haiku-5-5',
  background: false,
  fork: false,
} as const

test('espera órdenes al empezar, con modelo y sin contexto todavía', async ($, on) => {
  motor(on)
  for (const surface of SURFACES) {
    const l = await linea($, surface)
    expect(l?.text).toBe('◌ J.A.R.V.I.S. // ESPERANDO ÓRDENES · HAIKU-5.5')
    expect(l?.color).toBe('#7dd3fc')
  }
})

test('procesando, ejecutando, delegando y vuelta a esperar, con contexto', async ($, on) => {
  motor(on)
  let durante: Linea
  on('tool.call', async () => {
    durante = await linea($)
    return { result: {} }
  })
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: 'a1' }))

  await $.prompt.submit({ text: 'hola', wait: false, origin: { kind: 'composer' } })
  expect((await linea($))?.text).toBe('◐ J.A.R.V.I.S. // PROCESANDO · HAIKU-5.5')

  await $.tool.call({ tool: 'Bash', command: 'ls' })
  expect(durante?.text).toBe('◑ J.A.R.V.I.S. // EJECUTANDO Bash · HAIKU-5.5')
  expect((await linea($))?.text).toBe('◐ J.A.R.V.I.S. // PROCESANDO · HAIKU-5.5')

  await $.tool.call({ tool: 'mcp__github__create_issue', title: 'x' } as never)
  expect(durante?.text).toBe('◑ J.A.R.V.I.S. // EJECUTANDO github/create_issue · HAIKU-5.5')

  await $.agent.spawn(SPAWN)
  const del = await linea($)
  expect(del?.text).toBe('◒ J.A.R.V.I.S. // DELEGANDO → Explore (OPUS-5.5) · HAIKU-5.5')
  expect(del?.color).toBe('#fbbf24')

  await $.turn.complete({ ...TURNO, turnId: 't1', agentId: 'a1', usage: uso('claude-opus-5-5') })
  expect((await linea($))?.text).toBe('◐ J.A.R.V.I.S. // PROCESANDO · HAIKU-5.5')

  await $.turn.complete({ ...TURNO, turnId: 't2', usage: uso('claude-haiku-5-5') })
  const fin = await linea($)
  expect(fin?.text).toBe('◌ J.A.R.V.I.S. // ESPERANDO ÓRDENES · HAIKU-5.5 · CTX 42%')
  expect(fin?.color).toBe('#7dd3fc')
})

test('pensando mientras llega razonamiento visible', async ($, on) => {
  motor(on)
  const vistas: string[] = []
  on('turn.step', async function* (_, e) {
    yield { kind: 'thinking', index: 0, text: 'déjame ver…' } as const
    vistas.push((await linea($))?.text ?? '')
    yield { kind: 'thinking', index: 0, text: ' y esto' } as const
    yield { kind: 'text', index: 1, text: 'Hecho.' } as const
    vistas.push((await linea($))?.text ?? '')
    return { turnId: e.turnId, index: e.index, answer: 'Hecho.', toolUses: [], stopReason: 'end_turn', usage: null }
  })

  await $.prompt.submit({ text: 'hola', wait: false, origin: { kind: 'composer' } })
  const stream = $.turn.step({ turnId: 't1', index: 0, model: 'claude-haiku-5-5', messageCount: 1 })
  for await (const _ of stream) {
    // consumir
  }
  expect(vistas).toEqual(['◓ J.A.R.V.I.S. // PENSANDO · HAIKU-5.5', '◐ J.A.R.V.I.S. // PROCESANDO · HAIKU-5.5'])
})

test('un razonamiento vacío no cambia a pensando', async ($, on) => {
  motor(on)
  let vista = ''
  on('turn.step', async function* (_, e) {
    yield { kind: 'thinking', index: 0, text: '   ' } as const
    vista = (await linea($))?.text ?? ''
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: null }
  })
  await $.prompt.submit({ text: 'hola', wait: false, origin: { kind: 'composer' } })
  for await (const _ of $.turn.step({ turnId: 't1', index: 0, model: 'claude-haiku-5-5', messageCount: 1 })) {
    // consumir
  }
  expect(vista).toBe('◐ J.A.R.V.I.S. // PROCESANDO · HAIKU-5.5')
})

test('esperando permiso cuando el motor va a preguntar', async ($, on) => {
  motor(on)
  let durante: Linea
  on('tool.check', () => ({ decision: 'ask', reason: 'pregunta' }))
  on('classic.PermissionRequest', async () => {
    durante = await linea($)
    return { decision: { behavior: 'allow' } as const }
  })
  on('tool.call', () => ({ result: {} }))

  await $.prompt.submit({ text: 'hola', wait: false, origin: { kind: 'composer' } })
  await $.tool.call({ tool: 'Bash', command: 'rm -rf build' })
  expect(durante?.text).toBe('◈ J.A.R.V.I.S. // ESPERANDO PERMISO · Bash · HAIKU-5.5')
  expect((await linea($))?.text).toBe('◐ J.A.R.V.I.S. // PROCESANDO · HAIKU-5.5')
})

test('un permiso dentro de la delegación vuelve a delegando', async ($, on) => {
  motor(on)
  let durante: Linea
  on('agent.spawn', () => ({ model: 'claude-haiku-4-5-20251001', agentId: 'a1' }))
  on('tool.check', () => ({ decision: 'ask', reason: 'pregunta' }))
  on('classic.PermissionRequest', async () => {
    durante = await linea($)
    return { decision: { behavior: 'allow' } as const }
  })
  on('tool.call', () => ({ result: {} }))

  await $.prompt.submit({ text: 'hola', wait: false, origin: { kind: 'composer' } })
  await $.agent.spawn({ ...SPAWN, model: 'haiku' })
  await $.tool.call({ tool: 'Write', file_path: '/tmp/x', content: 'x', agentId: 'a1' } as never)
  expect(durante?.text).toBe('◈ J.A.R.V.I.S. // ESPERANDO PERMISO · Write · HAIKU-5.5')
  expect((await linea($))?.text).toBe('◒ J.A.R.V.I.S. // DELEGANDO → Explore (HAIKU-4.5) · HAIKU-5.5')
})

test('error en rojo cuando una herramienta falla', async ($, on) => {
  motor(on)
  on('tool.call', () => ({ result: 'exit 1', isError: true }) as never)

  await $.prompt.submit({ text: 'hola', wait: false, origin: { kind: 'composer' } })
  await $.tool.call({ tool: 'Bash', command: 'false' })
  const l = await linea($)
  expect(l?.text).toBe('✕ J.A.R.V.I.S. // ERROR EN Bash · HAIKU-5.5')
  expect(l?.color).toBe('#f87171')

  await $.turn.complete({ ...TURNO, turnId: 't1', usage: uso('claude-haiku-5-5') })
  expect((await linea($))?.text).toBe('◌ J.A.R.V.I.S. // ESPERANDO ÓRDENES · HAIKU-5.5 · CTX 42%')
})

test('color por modelo: Opus, Fable y otros por defecto', async ($, on) => {
  const casos: [string, string][] = [
    ['claude-opus-5-5', '#fbbf24'],
    ['claude-fable-1-0', '#c4b5fd'],
    ['claude-sonnet-5-0', '#dbeafe'],
  ]
  let modelo = ''
  on('session.model', () => ({ value: modelo }))
  for (const [m, color] of casos) {
    modelo = m
    for (const surface of SURFACES) expect((await linea($, surface))?.color).toBe(color)
  }
})

test(
  'colores configurables y valores raros vuelven al defecto',
  { options: { colorHaiku: '#00ff00', colorOpus: 'magenta', colorFable: 'no es un color!', colorOtro: '#123' } },
  async ($, on) => {
    let modelo = ''
    on('session.model', () => ({ value: modelo }))
    const casos: [string, string][] = [
      ['claude-haiku-5-5', '#00ff00'],
      ['claude-opus-5-5', 'magenta'],
      ['claude-fable-1-0', '#c4b5fd'],
      ['otro-modelo', '#123'],
    ]
    for (const [m, color] of casos) {
      modelo = m
      expect((await linea($))?.color).toBe(color)
    }
  },
)

test('idioma inglés desde la configuración', { options: { idioma: 'en' } }, async ($, on) => {
  motor(on)
  on('tool.call', () => ({ result: 'x', isError: true }) as never)
  for (const surface of SURFACES) {
    expect((await linea($, surface))?.text).toBe('◌ J.A.R.V.I.S. // AWAITING ORDERS · HAIKU-5.5')
  }
  await $.prompt.submit({ text: 'hi', wait: false, origin: { kind: 'composer' } })
  expect((await linea($))?.text).toBe('◐ J.A.R.V.I.S. // PROCESSING · HAIKU-5.5')
  await $.tool.call({ tool: 'Bash', command: 'false' })
  expect((await linea($))?.text).toBe('✕ J.A.R.V.I.S. // ERROR IN Bash · HAIKU-5.5')
})

test(
  'sin modelo ni contexto en la línea',
  { options: { mostrarModelo: false, mostrarContexto: false } },
  async ($, on) => {
    motor(on)
    await $.turn.complete({ ...TURNO, turnId: 't1', usage: uso('claude-haiku-5-5') })
    expect((await linea($))?.text).toBe('◌ J.A.R.V.I.S. // ESPERANDO ÓRDENES')
  },
)

test('el contexto sigue a session.measure', async ($, on) => {
  motor(on)
  on('session.measure', (_, e) => ({ changed: e.changed }))
  await $.session.measure({ context: { window: 200000, tokens: 150000, percent: 75 }, rateLimits: [], changed: ['context'] })
  expect((await linea($))?.text).toBe('◌ J.A.R.V.I.S. // ESPERANDO ÓRDENES · HAIKU-5.5 · CTX 75%')
})

test('modo compacto: solo símbolo y estado', { options: { modo: 'compacto' } }, async ($, on) => {
  motor(on)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /ESPERANDO/ }))?.text).toBe('◌ ESPERANDO ÓRDENES')
  await ui.unmount()
})

test('modo oculto deja la zona al motor', { options: { modo: 'oculto' } }, async ($, on) => {
  motor(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine')
  expect(await ui.find({ type: 'Text', text: /ESPERANDO/ })).toBeUndefined()
  await ui.unmount()
})

test('pulso: el símbolo se invierte al cambiar y se apaga solo', async ($, on) => {
  const reloj = motor(on)
  await $.prompt.submit({ text: 'hola', wait: false, origin: { kind: 'composer' } })
  expect((await linea($))?.inverse).toBe(true)
  await reloj.advance(700)
  expect((await linea($))?.inverse).not.toBe(true)
})

test('sin animación no hay pulso', { options: { animacion: false } }, async ($, on) => {
  motor(on)
  await $.prompt.submit({ text: 'hola', wait: false, origin: { kind: 'composer' } })
  expect((await linea($))?.inverse).not.toBe(true)
})

test('/banda cambia idioma y modo solo en la sesión, y reset vuelve a la configuración', async ($, on) => {
  motor(on)
  const run = (args: string) =>
    $.command.run({
      command: 'banda',
      args,
      origin: { kind: 'composer' },
      presentation: { layout: 'main', columns: 100 },
    } as never)

  expect((await run('en')).text).toBe(
    'Band: language en, mode completo (this session only; /banda reset goes back to the settings).',
  )
  expect((await linea($))?.text).toBe('◌ J.A.R.V.I.S. // AWAITING ORDERS · HAIKU-5.5')

  await run('compacto')
  expect((await linea($))?.text).toBe('◌ AWAITING ORDERS')

  expect((await run('xyz')).text).toBe(
    'Unknown option "xyz". Use: /banda es | en | completo | compacto | oculto | reset',
  )

  expect((await run('reset')).text).toBe('Banda: idioma es, modo completo (según la configuración).')
  expect((await linea($))?.text).toBe('◌ J.A.R.V.I.S. // ESPERANDO ÓRDENES · HAIKU-5.5')

  await run('oculto')
  expect(await linea($)).toBeUndefined()
})

test('una encuesta se queda la zona', async ($, on) => {
  motor(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, hasSurvey: true }, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine')
  await ui.unmount()
})
