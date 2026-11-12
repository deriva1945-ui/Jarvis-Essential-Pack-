import { expect, mock, test } from 'claude-code/testing'

const PANE = {
  plugin: 'consumo',
  component: 'Pane',
  requestId: 'consumo',
  props: {
    title: 'Consumo',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

test('the pane shows the model, the context and the cost', async ($, on) => {
  mock.clock(on, { now: 1_000 })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'consumo' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.model', () => ({ value: 'claude-haiku-5-5' }))
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: { tokens: 1000, window: 200000, percent: 1 },
      rateLimits: [],
      cost: { usd: 0.25 },
    },
  }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })

  expect((await ui.find({ type: 'Text', text: /Modelo de la sesión/ }))?.text).toContain('claude-haiku-5-5')
  expect((await ui.find({ type: 'Text', text: /Coste acumulado/ }))?.text).toContain('USD')
  expect((await ui.find({ type: 'Text', text: /Sin turnos todavía/ }))?.text).toBe('Sin turnos todavía.')
  await ui.unmount()
})

test('the pane splits the work by model', async ($, on) => {
  mock.clock(on, { now: 1_000 })
  on('session.model', () => ({ value: 'claude-fable-5' }))
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: { tokens: 5000, window: 200000, percent: 3 },
      rateLimits: [],
      cost: { usd: 1.5 },
    },
  }))
  on('turn.complete', () => ({ text: '' }))

  const usage = (model: string, input: number, output: number) => ({
    model,
    input_tokens: input,
    output_tokens: output,
    cache_read_input_tokens: 10,
    cache_creation_input_tokens: 0,
  })
  const turn = { answer: '', durationMs: 1, isAborted: false, reason: 'answer' } as const
  await $.turn.complete({ ...turn, turnId: 't1', usage: usage('claude-fable-5', 100, 100) })
  await $.turn.complete({ ...turn, turnId: 't2', agentId: 'a1', usage: usage('claude-opus-5-5', 500, 100) })
  await $.turn.complete({ ...turn, turnId: 't3', agentId: 'a2', usage: usage('claude-haiku-5-5', 150, 50) })
  await $.turn.complete({ ...turn, turnId: 't4', agentId: 'a2', usage: usage('claude-haiku-5-5', 0, 0) })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /^Opus/ }))?.text).toContain('60% del trabajo')
    expect((await ui.find({ type: 'Text', text: /^Haiku/ }))?.text).toContain('turnos 2 (50%)')
    expect((await ui.find({ type: 'Text', text: /^Fable/ }))?.text).toContain('(principal)')
    expect((await ui.find({ type: 'Text', text: /^Principal/ }))?.text).toContain('claude-fable-5')
    await ui.unmount()
  }
})

test('datos.js carries the history, the alert and a heartbeat', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000 })
  const writes: { path: string; text: string }[] = []
  on('fs.write', (_, e) => {
    writes.push(e)
    return { value: undefined }
  })
  on('process.run', () => ({ value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'consumo' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.model', () => ({ value: 'claude-fable-5' }))
  let usd = 0.5
  on('session.usage', () => ({
    value: { startedAt: 0, context: { tokens: 176000, window: 200000, percent: 88 }, rateLimits: [], cost: { usd } },
  }))
  on('turn.complete', () => ({ text: '' }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  usd = 0.75
  await $.turn.complete({
    answer: '', durationMs: 1, isAborted: false, reason: 'answer', turnId: 't1', agentId: 'a1',
    usage: { model: 'claude-opus-5-5', input_tokens: 300, output_tokens: 50, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
  })

  const last = () => {
    const w = writes.filter(x => x.path.endsWith('datos.js')).at(-1)
    return JSON.parse((w?.text ?? '').replace(/^window\.CONSUMO = /, '').replace(/;$/, ''))
  }
  const d = last()
  expect(d.alerta).toBe('critica')
  expect(d.historial).toHaveLength(1)
  expect(d.historial[0].familia).toBe('opus')
  expect(d.historial[0].coste).toBe(0.25)

  const before = d.latido
  await clock.advance(3_000)
  expect(last().latido).toBeGreaterThan(before)
  expect(last().actualizado).toBe(d.actualizado)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /Contexto/ }))?.text).toContain('CRÍTICO')
  expect((await ui.find({ type: 'Text', text: /Último turno/ }))?.text).toContain('350 tokens')
  await ui.unmount()
})
