import type { Hook, Register } from 'claude-code'

// Los mods del pack jarvis-essential-pack que /mods vigila.
const PACK = ['portero', 'resumen-sesion', 'consumo', 'jarvis-banda'] as const

// Los únicos nombres que /mods on y /mods off aceptan: el pack y este mismo mod.
const ALLOWED: readonly string[] = [...PACK, 'mods-estado']

const USAGE = 'Uso: /mods, /mods on <nombre> o /mods off <nombre>.'
const DONE = 'Hecho. El cambio se aplica en la próxima sesión; reinicia Claude Code.'

// Donde el usuario guarda su copia local de los mods (Windows).
const LOCAL_DIR = 'C:\\CLAUDE\\mods'

type Listed = { name: string; source: string; version: string; status: string; isActive: boolean }

type CliOutcome = { isOk: true; stdout: string } | { isOk: false; reason: string }

type ListOutcome =
  | { isOk: true; stdout: string; plugins: Listed[] }
  | { isOk: false; reason: string }

type Ctx = Parameters<Hook<'command.run'>>[0]

// Lee la salida de "claude plugin list":
//   > nombre@marketplace
//     Version: 1.2.3
//     Status: √ loaded
const parsePluginList = (stdout: string): Listed[] => {
  const plugins: Listed[] = []
  let current: Listed | undefined
  for (const raw of stdout.split(/\r?\n/)) {
    const line = raw.trim()
    const head = /^[>❯›»]\s*([^\s@]+)(?:@(\S+))?/.exec(line)
    if (head) {
      current = { name: head[1]!, source: head[2] ?? '', version: '?', status: '', isActive: false }
      plugins.push(current)
      continue
    }
    if (!current) continue
    const version = /^Version:\s*(.+)$/i.exec(line)
    if (version) current.version = version[1]!.trim()
    const status = /^Status:\s*(.+)$/i.exec(line)
    if (status) {
      current.status = status[1]!.trim()
      const s = current.status.toLowerCase()
      current.isActive = /loaded|enabled/.test(s) && !/disabled|failed|error|not /.test(s)
    }
  }
  return plugins
}

const errorText = (err: unknown): string =>
  err instanceof Error ? err.message : String(err)

// Ejecuta "claude <args>" sin shell. En Windows "claude" puede ser claude.cmd, que se prueba
// después. Nunca lanza: un fallo vuelve como texto en reason.
async function runClaude($: Ctx, args: string[]): Promise<CliOutcome> {
  const failures: string[] = []
  for (const exe of ['claude', 'claude.cmd']) {
    try {
      const run = await $.process.run([exe, ...args], { timeoutMs: 60_000 })
      if (run.exitCode === 0) return { isOk: true, stdout: run.stdout }
      const detail = (run.stderr || run.stdout).trim().split(/\r?\n/).slice(0, 3).join(' / ')
      return {
        isOk: false,
        reason: `"${exe} ${args.join(' ')}" terminó con código ${run.exitCode}${detail ? `: ${detail}` : ''}`,
      }
    } catch (err) {
      failures.push(`${exe}: ${errorText(err)}`)
    }
  }
  return {
    isOk: false,
    reason:
      `no se pudo ejecutar "claude ${args.join(' ')}" (${failures.join('; ')}). ` +
      'Comprueba que claude está en el PATH y que el mod tiene permiso para ejecutar procesos.',
  }
}

// /mods on <nombre> y /mods off <nombre>: solo nombres del pack. El cambio vale desde la
// próxima sesión; no se intenta recargar nada.
async function toggle($: Ctx, sub: 'on' | 'off', rest: string[]): Promise<string> {
  if (rest.length !== 1) return USAGE
  const given = rest[0]!
  const name = given.toLowerCase()
  if (!ALLOWED.includes(name)) {
    return `"${given}" no es un mod del pack. Nombres permitidos: ${ALLOWED.join(', ')}.`
  }
  const r = await runClaude($, ['plugin', sub === 'on' ? 'enable' : 'disable', name])
  if (!r.isOk) return `No se pudo ${sub === 'on' ? 'activar' : 'desactivar'} ${name}: ${r.reason}`
  return DONE
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'mods',
      description: 'Lista los mods del pack; on/off <nombre> los activa o desactiva',
      argumentHint: '[on|off <nombre>]',
    })
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'mods' }, async ($, e) => {
    const [sub, ...rest] = (e.args ?? '').trim().split(/\s+/).filter(Boolean)
    if (sub !== undefined) {
      const s = sub.toLowerCase()
      return { text: s === 'on' || s === 'off' ? await toggle($, s, rest) : USAGE }
    }

    // 1. Lista de plugins: la API no la da, así que se pregunta a la CLI.
    const cli = await runClaude($, ['plugin', 'list'])
    const outcome: ListOutcome = cli.isOk
      ? { isOk: true, stdout: cli.stdout, plugins: parsePluginList(cli.stdout) }
      : cli

    // 2. Copia local en C:\CLAUDE\mods: qué carpetas del pack hay.
    let localNames = new Set<string>()
    let localNote = ''
    try {
      if (await $.fs.exists(LOCAL_DIR)) {
        const entries = await $.fs.list(LOCAL_DIR)
        localNames = new Set(entries.filter(x => x.kind !== 'file').map(x => x.name.toLowerCase()))
        localNote = `${LOCAL_DIR}: ${localNames.size} carpeta(s)`
      } else {
        localNote = `${LOCAL_DIR}: sin copia local`
      }
    } catch (err) {
      localNote = `${LOCAL_DIR}: sin copia local (no se pudo leer: ${errorText(err)})`
    }

    const root = $.plugin.root
    const isRootLocal = root.replace(/\//g, '\\').toLowerCase().startsWith(LOCAL_DIR.toLowerCase() + '\\')

    // 3. Resumen del pack.
    const listed = outcome.isOk ? outcome.plugins : []
    const width = Math.max(...PACK.map(n => n.length))
    const missing: string[] = []
    const rows = PACK.map(name => {
      const found = listed.find(p => p.name.toLowerCase() === name)
      const local = localNames.has(name) ? `copia local: ${LOCAL_DIR}\\${name}` : 'sin copia local'
      let state: string
      if (!outcome.isOk) state = 'estado desconocido'
      else if (!found) state = 'no instalado'
      else if (found.isActive) state = `activo v${found.version}`
      else state = `no cargado v${found.version} (${found.status || 'sin estado'})`
      if (outcome.isOk && !found?.isActive) missing.push(name)
      const mark = !outcome.isOk ? '[?]' : found?.isActive ? '[x]' : '[ ]'
      return `  ${mark} ${name.padEnd(width)}  ${state} · ${local}`
    })

    const lines: string[] = []
    if (outcome.isOk) {
      lines.push('Plugins (claude plugin list):')
      if (listed.length === 0) lines.push('  (la lista está vacía)')
      for (const p of listed) {
        const isPack = (PACK as readonly string[]).includes(p.name.toLowerCase())
        lines.push(
          `  ${p.isActive ? 'activo   ' : 'inactivo '} ${p.name}@${p.source || '?'}  v${p.version}${isPack ? '  [pack]' : ''}`,
        )
      }
      if (listed.length === 0 && outcome.stdout.trim()) {
        lines.push('', outcome.stdout.trim())
      }
    } else {
      lines.push(`No se pudo leer la lista de plugins: ${outcome.reason}`)
    }
    lines.push('', 'Pack jarvis-essential-pack:', ...rows)
    if (missing.length > 0) {
      lines.push(
        '',
        `Aviso: del pack no están cargados: ${missing.join(', ')}.` +
          ' (Un mod cargado con --plugin-dir no aparece en "claude plugin list".)',
      )
    } else if (outcome.isOk) {
      lines.push('', 'Todos los mods del pack están activos.')
    }
    lines.push(
      '',
      localNote,
      `Este mod (mods-estado) se carga desde ${root}${isRootLocal ? ' (copia local)' : ''}.`,
    )

    return { text: lines.join('\n') }
  }).catch(($, e, next) =>
    next.called ? next(e) : { text: 'mods-estado: no se pudo preparar el informe de /mods.' },
  )
}
