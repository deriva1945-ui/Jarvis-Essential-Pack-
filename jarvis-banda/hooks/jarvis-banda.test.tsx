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

test('the band waits for orders at first', async ($, on) => {
  on('session.model', () => ({ value: 'claude-haiku-5-5' }))

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    const line = await ui.find({ type: 'Text', text: /J\.A\.R\.V\.I\.S\./ })
    expect(line?.text).toBe('◌ J.A.R.V.I.S. // ESPERANDO ÓRDENES')
    expect(line?.props.color).toBe('#7dd3fc')
    await ui.unmount()
  }
})

test('the band follows a turn and goes back to waiting', async ($, on) => {
  const toasts: string[] = []
  const statuses: (string | undefined)[] = []
  on('session.model', () => ({ value: 'claude-haiku-5-5' }))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('ui.status', (_, e) => {
    statuses.push(e.text)
    return { value: undefined }
  })
  on('prompt.submit', (_, e) => ({ text: e.text }))
  let duringTool = ''
  on('tool.call', async () => {
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
    duringTool = (await ui.find({ type: 'Text', text: /J\.A\.R/ }))?.text ?? ''
    await ui.unmount()
    return { result: {} }
  })
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: 'a1' }))
  on('turn.complete', () => ({ text: '' }))

  const line = async () => {
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
    const found = await ui.find({ type: 'Text', text: /J\.A\.R/ })
    await ui.unmount()
    return found
  }

  await $.prompt.submit({ text: 'hola', wait: false, origin: { kind: 'composer' } })
  expect((await line())?.text).toBe('◐ J.A.R.V.I.S. // PROCESANDO · HAIKU-5.5')

  await $.tool.call({ tool: 'Bash', command: 'ls' })
  expect(duringTool).toBe('◑ J.A.R.V.I.S. // EJECUTANDO Bash')
  expect((await line())?.text).toBe('◐ J.A.R.V.I.S. // PROCESANDO · HAIKU-5.5')

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
  const del = await line()
  expect(del?.text).toBe('◒ J.A.R.V.I.S. // DELEGANDO → Explore (OPUS-5.5)')
  expect(del?.props.color).toBe('#fbbf24')

  const turn = { answer: '', durationMs: 1, isAborted: false, reason: 'answer' } as const
  const usage = (model: string) => ({
    model,
    input_tokens: 10,
    output_tokens: 10,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
  })
  await $.turn.complete({ ...turn, turnId: 't1', agentId: 'a1', usage: usage('claude-opus-5-5') })
  expect((await line())?.text).toBe('◐ J.A.R.V.I.S. // PROCESANDO · HAIKU-5.5')

  await $.turn.complete({ ...turn, turnId: 't2', usage: usage('claude-haiku-5-5') })
  const done = await line()
  expect(done?.text).toBe('◌ J.A.R.V.I.S. // ESPERANDO ÓRDENES')
  expect(done?.props.color).toBe('#7dd3fc')

  // Sin duplicados: ni toasts ni línea de estado.
  expect(toasts).toEqual([])
  expect(statuses).toEqual([])
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
