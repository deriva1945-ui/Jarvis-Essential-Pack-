import { expect, test, type TestBody } from 'claude-code/testing'

const PACK = ['portero', 'resumen-sesion', 'consumo', 'jarvis-banda', 'mods-estado']

type Entry = { id: string; version: string; scope?: string; enabled: boolean; errors?: string[] }

const entry = (id: string, version: string, extra: Partial<Entry> = {}): Entry => ({
  id,
  version,
  scope: 'user',
  enabled: true,
  ...extra,
})

const BASE: Entry[] = [
  entry('portero@jarvis-essential-pack', '0.1.0'),
  entry('resumen-sesion@jarvis-essential-pack', '0.1.0'),
  entry('consumo@jarvis-essential-pack', '0.4.0'),
  entry('jarvis-banda@jarvis-essential-pack', '0.2.0', { enabled: false }),
  entry('mods-estado@jarvis-essential-pack', '0.4.0'),
  entry('superpowers@synced', '6.4.2', { scope: 'synced' }),
]

const MODS = {
  command: 'mods',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 100 },
} as const

const withArgs = (args: string) => ({ ...MODS, args })

const ok = (stdout: string) => ({
  exitCode: 0,
  stdout,
  stderr: '',
  isStdoutTruncated: false,
  isStderrTruncated: false,
})

const fail = (code: number, stderr: string) => ({ ...ok(''), exitCode: code, stderr })

type On = Parameters<TestBody>[1]

// Monta la CLI simulada: "plugin list --json" devuelve plugins y "plugin marketplace list --json"
// devuelve markets. Guarda cada argv en runs.
function cli(on: On, plugins: Entry[], markets: string[] = ['jarvis-essential-pack']) {
  const runs: string[][] = []
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', (_, e) => {
    runs.push([...e.argv])
    const args = e.argv.slice(1).join(' ')
    if (args === 'plugin list --json') return { value: ok(JSON.stringify(plugins)) }
    if (args === 'plugin marketplace list --json') {
      return { value: ok(JSON.stringify(markets.map(name => ({ name, source: 'github' })))) }
    }
    return { value: ok('') }
  })
  return runs
}

// Copia local simulada en una carpeta: mod → versión de su plugin.json.
function copiaLocal(on: On, dir: string, versions: Record<string, string>, extra: string[] = []) {
  const files = new Map<string, string>()
  for (const [mod, v] of Object.entries(versions)) {
    files.set(`${dir}/${mod}/.claude-plugin/plugin.json`, JSON.stringify({ name: mod, version: v }))
  }
  on('fs.exists', (_, e) => ({ value: e.path === dir || files.has(e.path) || extra.includes(e.path) }))
  on('fs.list', () => ({
    value: Object.keys(versions).map(name => ({ name, kind: 'dir' as const, size: 0, mtimeMs: 0, isLink: false })),
  }))
  on('fs.read', (_, e) => {
    const text = files.get(e.path)
    if (text === undefined) throw new Error(`ENOENT: ${e.path}`)
    return { value: text }
  })
}

const start = ($: Parameters<TestBody>[0]) =>
  $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

// Línea de la tabla de un mod.
const row = (text: string | undefined, name: string) =>
  (text ?? '').split('\n').find(l => new RegExp(`^\\s+\\[.\\] ${name}\\s`).test(l)) ?? ''

test('/mods shows the pack table: state, installed version and local copy version', { options: { modsDir: '/prueba/mods' } }, async ($, on) => {
  const runs = cli(on, BASE)
  copiaLocal(on, '/prueba/mods', { portero: '0.1.0', consumo: '0.4.0' })

  await start($)
  const { text } = await $.command.run(MODS)

  expect(runs[0]).toEqual(['claude', 'plugin', 'list', '--json'])
  expect(text).toContain('Pack jarvis-essential-pack:')
  for (const name of PACK) expect(row(text, name)).not.toBe('')
  expect(row(text, 'portero')).toMatch(/\[x\] portero\s+activo\s+0\.1\.0\s+0\.1\.0$/)
  expect(row(text, 'consumo')).toMatch(/activo\s+0\.4\.0\s+0\.4\.0$/)
  expect(row(text, 'jarvis-banda')).toMatch(/\[ \] jarvis-banda\s+desactivado\s+0\.2\.0\s+—$/)
  expect(text).toContain('Del pack no están cargados: jarvis-banda.')
  expect(text).toContain('superpowers@synced')
  expect(text).toContain('Copia local: /prueba/mods (2 mod(s) del pack)')
  for (const name of PACK) expect(row(text, name)).not.toContain('≠')
  expect(text).not.toContain('copia local es más')
})

test('/mods marks a version mismatch between the local copy and the installed mod', { options: { modsDir: '/prueba/mods' } }, async ($, on) => {
  cli(on, BASE)
  copiaLocal(on, '/prueba/mods', { portero: '0.2.0', consumo: '0.3.0', 'resumen-sesion': '0.1.0' })

  await start($)
  const { text } = await $.command.run(MODS)

  expect(row(text, 'portero')).toMatch(/0\.1\.0\s+0\.2\.0\s+≠$/)
  expect(row(text, 'consumo')).toMatch(/0\.4\.0\s+0\.3\.0\s+≠$/)
  expect(row(text, 'resumen-sesion')).not.toContain('≠')
  expect(text).toContain('portero: instalada 0.1.0, copia local 0.2.0 (la copia local es más nueva)')
  expect(text).toContain('claude plugin update portero@jarvis-essential-pack')
  expect(text).toContain('consumo: instalada 0.4.0, copia local 0.3.0 (la copia local es más antigua)')
  expect(text).toContain('/mods actualizar')
})

test('/mods warns about a pack mod that failed to load, with the error and a suggestion', async ($, on) => {
  const plugins = BASE.map(p =>
    p.id.startsWith('consumo@') ? { ...p, errors: ['Hooks module ./register.tsx failed to load: SyntaxError: Unexpected token'] } : p,
  )
  cli(on, plugins)
  on('fs.exists', () => ({ value: false }))

  await start($)
  const { text } = await $.command.run(MODS)

  expect(row(text, 'consumo')).toMatch(/\[!\] consumo\s+falló al cargar\s+0\.4\.0/)
  expect(text).toContain(
    'consumo@jarvis-essential-pack falló al cargar: Hooks module ./register.tsx failed to load: SyntaxError: Unexpected token',
  )
  expect(text).toContain('Sugerencia: actualízalo con "claude plugin update consumo@jarvis-essential-pack"')
  expect(text).toContain('claude --debug')
  expect(text).toContain('plugin.json y hooks/')
})

test('/mods reads the text list (Status and Error lines) when --json is not supported', async ($, on) => {
  const runs: string[][] = []
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', (_, e) => {
    runs.push([...e.argv])
    const args = e.argv.slice(1).join(' ')
    if (args === 'plugin list --json') return { value: fail(1, "error: unknown option '--json'") }
    if (args === 'plugin list') {
      return {
        value: ok(
          [
            'Installed plugins:',
            '',
            '  > portero@jarvis-essential-pack',
            '    Version: 0.1.0',
            '    Scope: user',
            '    Status: ✘ failed to load',
            '    Error: plugin.json: invalid JSON',
            '',
            '  > consumo@jarvis-essential-pack',
            '    Version: 0.4.0',
            '    Scope: user',
            '    Status: √ enabled',
            '',
          ].join('\n'),
        ),
      }
    }
    return { value: fail(1, 'nope') }
  })
  on('fs.exists', () => ({ value: false }))

  await start($)
  const { text } = await $.command.run(MODS)

  expect(runs.slice(0, 2)).toEqual([
    ['claude', 'plugin', 'list', '--json'],
    ['claude', 'plugin', 'list'],
  ])
  expect(row(text, 'portero')).toContain('falló al cargar')
  expect(row(text, 'consumo')).toMatch(/\[x\] consumo\s+activo\s+0\.4\.0/)
  expect(text).toContain('portero@jarvis-essential-pack falló al cargar: plugin.json: invalid JSON')
  expect(text).not.toContain('falló al cargar: failed to load')
})

test('/mods detects old installs from the portero-claude marketplace and only suggests how to clean them', async ($, on) => {
  const plugins = [
    entry('portero@portero-claude', '0.1.0'),
    entry('consumo@portero-claude', '0.2.0', { scope: 'project' }),
    entry('consumo@jarvis-essential-pack', '0.4.0'),
  ]
  const runs = cli(on, plugins, ['portero-claude'])
  on('fs.exists', () => ({ value: false }))

  await start($)
  const { text } = await $.command.run(MODS)

  expect(row(text, 'portero')).toContain('activo (marketplace antiguo)')
  expect(row(text, 'consumo')).toMatch(/activo\s+0\.4\.0/)
  expect(text).toContain('Hay restos del marketplace antiguo "portero-claude"')
  expect(text).toContain('claude plugin uninstall portero@portero-claude')
  expect(text).toContain('claude plugin uninstall consumo@portero-claude --scope project')
  expect(text).toContain('claude plugin marketplace remove portero-claude')
  expect(text).toContain('claude plugin marketplace add deriva1945-ui/portero-claude')
  expect(text).toContain('claude plugin install portero@jarvis-essential-pack')
  // Solo lee: nunca desinstala ni quita marketplaces.
  for (const argv of runs) expect(argv.slice(1, 3)).not.toEqual(['plugin', 'uninstall'])
  expect(runs.map(r => r.slice(1).join(' '))).toEqual(['plugin list --json', 'plugin marketplace list --json'])
})

test('/mods actualizar shows the exact commands without running anything that changes state', { options: { modsDir: '/prueba/mods' } }, async ($, on) => {
  const runs = cli(on, BASE)
  on('fs.exists', () => ({ value: false }))

  await start($)
  const { text } = await $.command.run(withArgs('actualizar'))

  expect(runs.map(r => r.slice(1).join(' '))).toEqual(['plugin list --json'])
  expect(text).toContain('no se ejecuta nada')
  expect(text).toContain('claude plugin marketplace update jarvis-essential-pack')
  expect(text).toContain('claude plugin update consumo@jarvis-essential-pack')
  expect(text).toContain('git clone https://github.com/deriva1945-ui/portero-claude.git "/prueba/portero-claude"')
  expect(text).toContain('git -C "/prueba/portero-claude" pull')
  for (const name of PACK) {
    expect(text).toContain(`mkdir -p "/prueba/mods/${name}" && cp -R "/prueba/portero-claude/${name}/." "/prueba/mods/${name}/"`)
  }
  expect(text).toContain('Reinicia Claude Code')
})

test('/mods actualizar uses git pull when the local copy is a clone, and robocopy on Windows', { options: { modsDir: 'D:\\Mods' } }, async ($, on) => {
  cli(on, [])
  on('fs.exists', (_, e) => ({ value: e.path.endsWith('D:\\Mods\\.git') }))

  await start($)
  const git = await $.command.run(withArgs('update'))
  expect(git.text).toContain('git -C "D:\\Mods" pull')
  expect(git.text).toContain('claude plugin install portero@jarvis-essential-pack')
  expect(git.text).not.toContain('robocopy')
})

test('/mods actualizar copies with robocopy when the Windows local copy is not a clone', { options: { modsDir: 'C:\\Users\\yo\\CLAUDE\\mods' } }, async ($, on) => {
  cli(on, BASE)
  on('fs.exists', (_, e) => ({ value: e.path.endsWith('C:\\Users\\yo\\CLAUDE\\portero-claude\\.git') }))

  await start($)
  const { text } = await $.command.run(withArgs('actualizar'))
  expect(text).not.toContain('git clone')
  expect(text).toContain('PowerShell')
  expect(text).toContain('git -C "C:\\Users\\yo\\CLAUDE\\portero-claude" pull')
  expect(text).toContain('robocopy "C:\\Users\\yo\\CLAUDE\\portero-claude\\consumo" "C:\\Users\\yo\\CLAUDE\\mods\\consumo" /E')
})

test('/mods ayuda lists every subcommand without running anything', async ($, on) => {
  const runs = cli(on, BASE)

  await start($)
  const a = await $.command.run(withArgs('ayuda'))
  const b = await $.command.run(withArgs('help'))
  const c = await $.command.run(withArgs('borrar'))

  expect(runs).toHaveLength(0)
  for (const s of ['/mods on <nombre>', '/mods off <nombre>', '/mods actualizar', '/mods ayuda']) expect(a.text).toContain(s)
  expect(a.text).toContain('Mods del pack: portero, resumen-sesion, consumo, jarvis-banda, mods-estado.')
  expect(b.text).toBe(a.text)
  expect(c.text).toContain('Subcomando desconocido: "borrar"')
  expect(c.text).toContain('/mods ayuda')
})

test('idioma "en" answers in English', { options: { idioma: 'en' } }, async ($, on) => {
  cli(on, BASE)
  on('fs.exists', () => ({ value: false }))

  await start($)
  const report = await $.command.run(MODS)
  const help = await $.command.run(withArgs('help'))

  expect(row(report.text, 'portero')).toMatch(/\[x\] portero\s+active\s+0\.1\.0/)
  expect(report.text).toContain('Pack mods not loaded: jarvis-banda.')
  expect(help.text).toContain('/mods update')
  expect(help.text).toContain('/mods subcommands:')
})

test('/mods shows mods-estado as in use when it is not in the list (--plugin-dir)', async ($, on) => {
  cli(on, BASE.filter(p => !p.id.startsWith('mods-estado@')))
  on('fs.exists', () => ({ value: false }))

  await start($)
  const { text } = await $.command.run(MODS)
  expect(row(text, 'mods-estado')).toMatch(/\[x\] mods-estado\s+en uso/)
  expect(text).not.toMatch(/no están cargados: .*mods-estado/)
})

test('/mods looks in ~/CLAUDE/mods by default, with "~" as the user folder', async ($, on) => {
  const looked: string[] = []
  cli(on, BASE)
  on('env.get', (_, e) => ({ value: e.name === 'USERPROFILE' ? 'D:\\Usuarios\\prueba' : undefined }))
  on('fs.exists', (_, e) => {
    looked.push(e.path)
    return { value: false }
  })

  await start($)
  const { text } = await $.command.run(MODS)

  // Fuera de Windows el motor puede anteponer una carpeta a esa ruta, así que solo se mira el final.
  expect(looked).toHaveLength(1)
  expect(looked[0]?.endsWith('D:\\Usuarios\\prueba\\CLAUDE\\mods')).toBe(true)
  expect(text).toContain('D:\\Usuarios\\prueba\\CLAUDE\\mods: sin copia local')
})

test('/mods answers clearly when claude is not on the PATH', async ($, on) => {
  const runs: string[][] = []
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', (_, e) => {
    runs.push([...e.argv])
    throw new Error('spawn claude ENOENT')
  })
  on('fs.exists', () => ({ value: false }))

  await start($)
  const { text } = await $.command.run(MODS)

  // Sin claude no se reintenta con la salida de texto: solo claude y claude.cmd una vez.
  expect(runs).toHaveLength(2)
  expect(text).toContain('No se pudo leer la lista de plugins')
  expect(text).toContain('PATH')
  for (const name of PACK) expect(row(text, name)).toContain('[?]')
})

const DONE = 'Hecho. El cambio se aplica en la próxima sesión; reinicia Claude Code.'

test('/mods on and /mods off run claude plugin enable/disable and say it applies next session', async ($, on) => {
  const runs = cli(on, [])

  await start($)
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

  await start($)
  const { text } = await $.command.run(withArgs('on portero'))

  expect(runs.at(-1)).toEqual(['claude.cmd', 'plugin', 'enable', 'portero'])
  expect(text).toBe(DONE)
})

test('/mods on|off rejects names outside the pack without running anything', async ($, on) => {
  const runs = cli(on, [])

  await start($)
  const a = await $.command.run(withArgs('off superpowers'))
  const b = await $.command.run(withArgs('on ../portero'))
  const c = await $.command.run(withArgs('on'))

  expect(runs).toHaveLength(0)
  expect(a.text).toContain('"superpowers" no es un mod del pack')
  expect(a.text).toContain('portero, resumen-sesion, consumo, jarvis-banda, mods-estado')
  expect(b.text).toContain('no es un mod del pack')
  expect(c.text).toContain('Uso: /mods')
})

test('/mods off answers clearly when the process fails, without throwing', async ($, on) => {
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', () => ({ value: fail(1, 'Plugin "consumo" not found\nmore') }))

  await start($)
  const failed = await $.command.run(withArgs('off consumo'))
  expect(failed.text).toContain('No se pudo desactivar consumo')
  expect(failed.text).toContain('terminó con código 1')
  expect(failed.text).toContain('Plugin "consumo" not found')
  expect(failed.text).not.toContain('Hecho.')
})
