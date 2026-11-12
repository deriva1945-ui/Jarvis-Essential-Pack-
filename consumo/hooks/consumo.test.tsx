import { expect, mock, test } from 'claude-code/testing'

import { PAGE } from './page'

const ok = { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }

test('the page has the key sections, the size breakpoints and the density toggle', () => {
  for (const id of ['p-ctx', 'p-cost', 'p-mod', 'p-chart', 'p-hist', 'p-agt', 'dens']) {
    expect(PAGE).toContain(`id="${id}"`)
  }
  expect(PAGE).toContain('Reparto por modelo')
  expect(PAGE).toContain('datos.js')
  expect(PAGE).toContain('@media (min-width:1600px)')
  expect(PAGE).toContain('@media (min-width:900px)')
  expect(PAGE).toContain('@media (max-width:899px)')
  expect(PAGE).toContain('localStorage')
  expect(PAGE).toContain('text-overflow:ellipsis')
  // Etiquetas >= 14 px y valores >= 16 px.
  expect(PAGE).toContain('--fk:clamp(14px,')
  expect(PAGE).toContain('--fv:clamp(16px,')
  expect(PAGE).not.toContain('#6b7a90')
})

test('session.start writes the page and the data and opens the window, without a side pane', async ($, on) => {
  mock.clock(on, { now: 1_000 })
  const writes: { path: string; text: string }[] = []
  const runs: (readonly string[])[] = []
  const opens: unknown[] = []
  on('fs.write', (_, e) => {
    writes.push(e)
    return { value: undefined }
  })
  on('process.run', (_, e) => {
    runs.push(e.argv)
    return ok
  })
  on('ui.open', (_, e) => {
    opens.push(e)
    return { value: { isPlaced: true } }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.model', () => ({ value: 'claude-haiku-5-5' }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { tokens: 1000, window: 200000, percent: 1 }, rateLimits: [], cost: { usd: 0.25 } },
  }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  expect(opens).toHaveLength(0)
  expect(writes.find(w => w.path.endsWith('index.html'))?.text).toBe(PAGE)
  const d = writes.find(w => w.path.endsWith('datos.js'))?.text ?? ''
  expect(d).toContain('window.CONSUMO = ')
  expect(d).toContain('claude-haiku-5-5')
  expect(runs.some(a => a.some(x => x.includes('--app=file:///C:/CLAUDE/consumo/index.html')))).toBe(true)
})

test('datos.js splits the work by model and carries the history, the alert and a heartbeat', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000 })
  const writes: { path: string; text: string }[] = []
  on('fs.write', (_, e) => {
    writes.push(e)
    return { value: undefined }
  })
  on('process.run', () => ok)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.model', () => ({ value: 'claude-fable-5' }))
  let usd = 0.5
  on('session.usage', () => ({
    value: { startedAt: 0, context: { tokens: 176000, window: 200000, percent: 88 }, rateLimits: [], cost: { usd } },
  }))
  on('turn.complete', () => ({ text: '' }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const usage = (model: string, input: number, output: number) => ({
    model,
    input_tokens: input,
    output_tokens: output,
    cache_read_input_tokens: 10,
    cache_creation_input_tokens: 0,
  })
  const turn = { answer: '', durationMs: 1, isAborted: false, reason: 'answer' } as const
  await $.turn.complete({ ...turn, turnId: 't1', usage: usage('claude-fable-5', 100, 100) })
  usd = 0.75
  await $.turn.complete({ ...turn, turnId: 't2', agentId: 'a1', usage: usage('claude-opus-5-5', 500, 100) })
  await $.turn.complete({ ...turn, turnId: 't3', agentId: 'a2', usage: usage('claude-haiku-5-5', 150, 50) })
  await $.turn.complete({ ...turn, turnId: 't4', agentId: 'a2', usage: usage('claude-haiku-5-5', 0, 0) })

  const last = () => {
    const w = writes.filter(x => x.path.endsWith('datos.js')).at(-1)
    return JSON.parse((w?.text ?? '').replace(/^window\.CONSUMO = /, '').replace(/;$/, ''))
  }
  const d = last()
  expect(d.alerta).toBe('critica')
  expect(d.historial).toHaveLength(4)
  expect(d.historial[1].familia).toBe('opus')
  expect(d.historial[1].coste).toBe(0.25)
  const by = (f: string) => d.modelos.find((m: { familia: string }) => m.familia === f)
  expect(by('opus').reparto).toBe(60)
  expect(by('haiku').turnos).toBe(2)
  expect(by('haiku').repartoTurnos).toBe(50)
  expect(by('fable').principal).toBe(true)
  expect(d.agentes.find((a: { nombre: string }) => a.nombre === 'Principal').modelo).toBe('claude-fable-5')

  const before = d.latido
  await clock.advance(3_000)
  expect(last().latido).toBeGreaterThan(before)
  expect(last().actualizado).toBe(d.actualizado)
})
