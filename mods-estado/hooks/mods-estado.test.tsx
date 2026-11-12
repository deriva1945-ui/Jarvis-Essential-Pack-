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

test('/mods reports the local copy folders in the modsDir folder', { options: { modsDir: '/prueba/mods' } }, async ($, on) => {
  const looked: string[] = []
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', () => ({ value: ok(LIST) }))
  on('fs.exists', (_, e) => {
    looked.push(e.path)
    return { value: true }
  })
  on('fs.list', () => ({
    value: [
      { name: 'portero', kind: 'dir', size: 0, mtimeMs: 0, isLink: false },
      { name: 'consumo', kind: 'dir', size: 0, mtimeMs: 0, isLink: false },
    ],
  }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const { text } = await $.command.run(MODS)

  expect(looked).toEqual(['/prueba/mods'])
  expect(text).toContain('copia local: /prueba/mods/portero')
  expect(text).toContain('copia local: /prueba/mods/consumo')
  expect(text).toContain('/prueba/mods: 2 carpeta(s)')
})

test('/mods looks in ~/CLAUDE/mods by default, with "~" as the user folder', async ($, on) => {
  const looked: string[] = []
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', () => ({ value: ok(LIST) }))
  on('env.get', (_, e) => ({ value: e.name === 'USERPROFILE' ? 'D:\\Usuarios\\prueba' : undefined }))
  on('fs.exists', (_, e) => {
    looked.push(e.path)
    return { value: false }
  })

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const { text } = await $.command.run(MODS)

  // Carpeta de usuario de ejemplo (formato de Windows) en otra unidad. Fuera de Windows el motor
  // trata esa ruta como relativa y le antepone una carpeta, así que solo se mira el final.
  expect(looked).toHaveLength(1)
  expect(looked[0]?.endsWith('D:\\Usuarios\\prueba\\CLAUDE\\mods')).toBe(true)
  expect(text).toContain('D:\\Usuarios\\prueba\\CLAUDE\\mods: sin copia local')
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

const DONE = 'Hecho. El cambio se aplica en la próxima sesión; reinicia Claude Code.'

const withArgs = (args: string) => ({ ...MODS, args })

test('/mods on and /mods off run claude plugin enable/disable and say it applies next session', async ($, on) => {
  const runs: string[][] = []
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', (_, e) => {
    runs.push([...e.argv])
    return { value: ok('') }
  })

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const a = await $.command.run(withArgs('on consumo'))
  const b = await $.command.run(withArgs('off jarvis-banda'))
  const c = await $.command.run(withArgs('  OFF   mods-estado '))

  expect(runs).toEqual([
    ['claude', 'plugin', 'enable', 'consumo'],
    ['claude', 'plugin', 'disable', 'jarvis-banda'],
    ['claude', 'plugin', 'disable', 'mods-estado'],
  ])
  expect(a.text).toBe(DONE)
  expect(b.text).toBe(DONE)
  expect(c.text).toBe(DONE)
})

test('/mods on falls back to claude.cmd when claude cannot be started', async ($, on) => {
  const runs: string[][] = []
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', (_, e) => {
    runs.push([...e.argv])
    if (e.argv[0] === 'claude') throw new Error('spawn claude ENOENT')
    return { value: ok('') }
  })

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const { text } = await $.command.run(withArgs('on portero'))

  expect(runs.at(-1)).toEqual(['claude.cmd', 'plugin', 'enable', 'portero'])
  expect(text).toBe(DONE)
})

test('/mods on|off rejects names outside the pack without running anything', async ($, on) => {
  const runs: string[][] = []
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', (_, e) => {
    runs.push([...e.argv])
    return { value: ok('') }
  })

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const a = await $.command.run(withArgs('off superpowers'))
  const b = await $.command.run(withArgs('on ../portero'))
  const c = await $.command.run(withArgs('on'))
  const d = await $.command.run(withArgs('borrar consumo'))

  expect(runs).toHaveLength(0)
  expect(a.text).toContain('"superpowers" no es un mod del pack')
  expect(a.text).toContain('portero, resumen-sesion, consumo, jarvis-banda, mods-estado')
  expect(b.text).toContain('no es un mod del pack')
  expect(c.text).toContain('Uso: /mods')
  expect(d.text).toContain('Uso: /mods')
})

test('/mods off answers clearly when the process fails, without throwing', async ($, on) => {
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', () => ({
    value: { ...ok(''), exitCode: 1, stderr: 'Plugin "consumo" not found\nmore' },
  }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const failed = await $.command.run(withArgs('off consumo'))
  expect(failed.text).toContain('No se pudo desactivar consumo')
  expect(failed.text).toContain('terminó con código 1')
  expect(failed.text).toContain('Plugin "consumo" not found')
  expect(failed.text).not.toContain('Hecho.')
})

test('/mods on answers clearly when neither claude nor claude.cmd can be run', async ($, on) => {
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', () => {
    throw new Error('spawn ENOENT')
  })

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const { text } = await $.command.run(withArgs('on resumen-sesion'))
  expect(text).toContain('No se pudo activar resumen-sesion')
  expect(text).toContain('PATH')
})
