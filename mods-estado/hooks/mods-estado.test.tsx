import { expect, test } from 'claude-code/testing'

const PACK = ['portero', 'resumen-sesion', 'consumo', 'jarvis-banda']

const LIST = [
  'Installed plugins:',
  '',
  '  > portero@jarvis-essential-pack',
  '    Version: 0.1.0',
  '    Status: √ loaded',
  '',
  '  > resumen-sesion@jarvis-essential-pack',
  '    Version: 0.1.0',
  '    Status: √ loaded',
  '',
  '  > consumo@jarvis-essential-pack',
  '    Version: 0.2.0',
  '    Status: √ loaded',
  '',
  '  > jarvis-banda@jarvis-essential-pack',
  '    Version: 0.1.0',
  '    Status: ✘ disabled',
  '',
  '  > superpowers@synced',
  '    Version: 6.4.2',
  '    Status: √ loaded',
  '',
].join('\n')

const MODS = {
  command: 'mods',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 100 },
} as const

const ok = (stdout: string) => ({
  exitCode: 0,
  stdout,
  stderr: '',
  isStdoutTruncated: false,
  isStderrTruncated: false,
})

test('/mods lists every plugin of the pack and warns about the one not loaded', async ($, on) => {
  const runs: string[][] = []
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', (_, e) => {
    runs.push([...e.argv])
    return { value: ok(LIST) }
  })
  on('fs.exists', () => ({ value: false }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const { text } = await $.command.run(MODS)

  expect(runs[0]).toEqual(['claude', 'plugin', 'list'])
  for (const name of PACK) expect(text).toContain(name)
  expect(text).toContain('activo v0.2.0')
  expect(text).toContain('superpowers@synced')
  expect(text).toContain('Aviso: del pack no están cargados: jarvis-banda.')
  expect(text).toContain('sin copia local')
})

test('/mods reports the local copy folders when C:\\CLAUDE\\mods exists', async ($, on) => {
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', () => ({ value: ok(LIST) }))
  on('fs.exists', () => ({ value: true }))
  on('fs.list', () => ({
    value: [
      { name: 'portero', kind: 'dir', size: 0, mtimeMs: 0, isLink: false },
      { name: 'consumo', kind: 'dir', size: 0, mtimeMs: 0, isLink: false },
    ],
  }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const { text } = await $.command.run(MODS)

  expect(text).toContain('copia local: C:\\CLAUDE\\mods\\portero')
  expect(text).toContain('copia local: C:\\CLAUDE\\mods\\consumo')
})

test('/mods answers clearly when claude is not on the PATH', async ($, on) => {
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', () => {
    throw new Error('spawn claude ENOENT')
  })
  on('fs.exists', () => ({ value: false }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const { text } = await $.command.run(MODS)

  expect(text).toContain('No se pudo leer la lista de plugins')
  expect(text).toContain('PATH')
  for (const name of PACK) expect(text).toContain(name)
})
