import { expect, test } from 'claude-code/testing'

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

const USAGE = {
  value: {
    startedAt: 0,
    context: { tokens: 46000, window: 200000, percent: 23 },
    rateLimits: [],
    cost: { usd: 0.5 },
  },
}

test('the band waits for orders at first', async ($, on) => {
  on('session.model', () => ({ value: 'claude-haiku-5-5' }))
  on('session.usage', () => USAGE)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Text', text: /ESPERANDO/ }))?.text).toBe('ESPERANDO ÓRDENES')
    const head = await ui.find({ type: 'Text', text: /J\.A\.R\.V\.I\.S\./ })
    expect(head?.text).toContain('◌')
    expect(head?.text).toContain('MODELO HAIKU-5.5')
    expect(head?.text).toContain('CTX 23%')
    expect(head?.props.color).toBe('#7dd3fc')
    await ui.unmount()
  }
})

test('the band follows a turn: tool, delegation to Opus, completion', async ($, on) => {
  const toasts: string[] = []
  const statuses: (string | undefined)[] = []
  on('session.model', () => ({ value: 'claude-haiku-5-5' }))
  on('session.usage', () => USAGE)
  on('ui.toast', (_, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('ui.status', (_, e) => {
    statuses.push(e.text)
    return { value: undefined }
  })
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('tool.call', () => ({ result: {} }))
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: 'a1' }))
  on('turn.complete', () => ({ text: '' }))

  await $.prompt.submit({ text: 'hola', wait: false, origin: { kind: 'composer' } })
  let ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /PROCESANDO/ }))?.text).toBe('PROCESANDO · HAIKU-5.5')
  expect((await ui.find({ type: 'Text', text: /J\.A\.R/ }))?.text).toContain('◐')
  await ui.unmount()

  await $.tool.call({ tool: 'Bash', command: 'ls' })
  expect(statuses).toContain('◑ J.A.R.V.I.S. · EJECUTANDO Bash')

  await $.agent.spawn({
    tool_use_id: 'tu1',
    prompt: 'p',
    description: 'd',
    subagentType: 'Explore',
    provider: { plugin: 'engine', tier: 'core' },
    model: 'opus',
    parentModel: 'claude-haiku-5-5',
    background: false,
    fork: false,
  })
  ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const del = await ui.find({ type: 'Text', text: /DELEGANDO/ })
  expect(del?.text).toBe('DELEGANDO → Explore (OPUS-5.5)')
  expect(del?.props.color).toBe('#fbbf24')
  expect((await ui.find({ type: 'Text', text: /J\.A\.R/ }))?.text).toContain('◒')
  await ui.unmount()

  const turn = { answer: '', durationMs: 1, isAborted: false, reason: 'answer' } as const
  const usage = (model: string, input: number, output: number) => ({
    model,
    input_tokens: input,
    output_tokens: output,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
  })
  await $.turn.complete({ ...turn, turnId: 't1', agentId: 'a1', usage: usage('claude-opus-5-5', 600, 100) })
  expect(toasts.some(t => t.includes('SUBAGENTE OPUS TERMINADO'))).toBe(true)

  await $.turn.complete({ ...turn, turnId: 't2', usage: usage('claude-haiku-5-5', 250, 50) })
  const done = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await done.find({ type: 'Text', text: /TAREA COMPLETADA/ }))?.text).toContain('1.0K TOKENS')
  expect((await done.find({ type: 'Text', text: /^REPARTO/ }))?.text).toBe('REPARTO OPUS 70% · HAIKU 30%')
  expect((await done.find({ type: 'Text', text: /^CTX/ }))?.text).toBe('CTX ▰▰▱▱▱▱▱▱▱▱ 23% · 46.0K/200.0K')
  expect((await done.find({ type: 'Text', text: /J\.A\.R/ }))?.text).toContain('●')
  await done.unmount()

  expect(toasts.some(t => t.includes('TAREA COMPLETADA'))).toBe(true)
  expect(statuses.some(t => t?.includes('DELEGANDO'))).toBe(true)
})

test('a survey keeps the band for itself', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, hasSurvey: true }, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine')
  await ui.unmount()
})
