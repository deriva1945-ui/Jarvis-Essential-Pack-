import { expect, test } from 'claude-code/testing'

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
