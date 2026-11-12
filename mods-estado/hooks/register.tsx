import type { Hook, Register } from 'claude-code'

import {
  compararVersiones,
  type Instalado,
  isActivo,
  parseListaJson,
  parseListaTexto,
  parseMarketplaces,
  versionDeManifest,
} from './lista'
import { esAbsoluta, esRutaWindows, expandir, MODS_DIR_DEFAULT, padre, unir } from './rutas'
import { type Idioma, idiomaDe, textos } from './textos'

// Los mods del pack jarvis-essential-pack. mods-estado es este mismo mod.
const SELF = 'mods-estado'
const PACK = ['portero', 'resumen-sesion', 'consumo', 'jarvis-banda', SELF] as const

// Marketplace actual del pack y el nombre que tenía antes.
const MARKETPLACE = 'jarvis-essential-pack'
const OLD_MARKETPLACE = 'portero-claude'
const REPO = 'deriva1945-ui/portero-claude'
const REPO_URL = `https://github.com/${REPO}.git`

// Valores de userConfig. register() los fija al cargar el módulo; un cambio en la configuración
// recarga el módulo con los valores nuevos.
let modsDirOption = MODS_DIR_DEFAULT
let idioma: Idioma = 'es'

const T = () => textos(idioma)

type Ctx = Parameters<Hook<'command.run'>>[0]

type CliOutcome =
  | { isOk: true; stdout: string }
  | { isOk: false; reason: string; isSpawnFailure: boolean }

const errorText = (err: unknown): string => (err instanceof Error ? err.message : String(err))

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
        reason: T().exitCode(`${exe} ${args.join(' ')}`, run.exitCode ?? -1, detail),
        isSpawnFailure: false,
      }
    } catch (err) {
      failures.push(`${exe}: ${errorText(err)}`)
    }
  }
  return { isOk: false, reason: T().cannotRun(`claude ${args.join(' ')}`, failures.join('; ')), isSpawnFailure: true }
}

// Lista de plugins instalados: primero "claude plugin list --json"; si esa versión de la CLI no
// lo admite, la salida de texto.
async function leerPlugins($: Ctx): Promise<{ isOk: true; plugins: Instalado[] } | { isOk: false; reason: string }> {
  const json = await runClaude($, ['plugin', 'list', '--json'])
  if (json.isOk) {
    const parsed = parseListaJson(json.stdout)
    if (parsed) return { isOk: true, plugins: parsed }
  } else if (json.isSpawnFailure) {
    return json
  }
  const text = await runClaude($, ['plugin', 'list'])
  return text.isOk ? { isOk: true, plugins: parseListaTexto(text.stdout) } : text
}

// Marketplaces configurados, o null si no se pudieron leer.
async function leerMarketplaces($: Ctx): Promise<string[] | null> {
  const r = await runClaude($, ['plugin', 'marketplace', 'list', '--json'])
  return r.isOk ? parseMarketplaces(r.stdout) : null
}

// Carpeta de la copia local. "~" es la carpeta del usuario: USERPROFILE en Windows, HOME en
// macOS y Linux. Devuelve null si hace falta y no se conoce.
async function carpetaMods($: Ctx): Promise<string | null> {
  let home: string | undefined
  try {
    home = (await $.env.get('USERPROFILE')) || (await $.env.get('HOME')) || undefined
  } catch {
    home = undefined
  }
  return expandir(modsDirOption, home)
}

// Si la ruta "file" está dentro de la carpeta "dir" (sin distinguir "/" de "\" ni mayúsculas).
const dentroDe = (file: string, dir: string) => {
  const norm = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
  return esAbsoluta(dir) && norm(file).startsWith(norm(dir) + '/')
}

async function existe($: Ctx, path: string): Promise<boolean> {
  try {
    return await $.fs.exists(path)
  } catch {
    return false
  }
}

// Versión del plugin.json de una carpeta de mod: la versión, 'ilegible' o null si no hay manifiesto.
async function versionEn($: Ctx, modDir: string): Promise<string | null> {
  const manifest = unir(unir(modDir, '.claude-plugin'), 'plugin.json')
  if (!(await existe($, manifest))) return null
  try {
    const text = await $.fs.read(manifest)
    return typeof text === 'string' ? (versionDeManifest(text) ?? T().unreadable) : T().unreadable
  } catch {
    return T().unreadable
  }
}

type Copia = {
  dir: string | null
  note: string // línea sobre la carpeta
  versions: Map<string, string> // mod → versión ('ilegible' si no se pudo leer)
  isGit: boolean
}

async function leerCopia($: Ctx): Promise<Copia> {
  const t = T()
  const dir = await carpetaMods($)
  const versions = new Map<string, string>()
  if (dir === null) return { dir, note: t.localUnknownHome(modsDirOption), versions, isGit: false }
  try {
    if (!(await $.fs.exists(dir))) return { dir, note: t.localNone(dir), versions, isGit: false }
    const entries = await $.fs.list(dir)
    const names = new Set(entries.filter(x => x.kind !== 'file').map(x => x.name.toLowerCase()))
    for (const name of PACK) {
      if (!names.has(name)) continue
      versions.set(name, (await versionEn($, unir(dir, name))) ?? '?')
    }
    return { dir, note: t.localCount(dir, versions.size), versions, isGit: names.has('.git') }
  } catch (err) {
    return { dir, note: t.localUnreadable(dir, errorText(err)), versions, isGit: false }
  }
}

// La instalación que cuenta para un mod: la del marketplace actual, si no otra que no sea del
// antiguo, si no la del antiguo.
function elegir(plugins: Instalado[], name: string): Instalado | undefined {
  const all = plugins.filter(p => p.name.toLowerCase() === name)
  return (
    all.find(p => p.marketplace === MARKETPLACE) ?? all.find(p => p.marketplace !== OLD_MARKETPLACE) ?? all[0]
  )
}

const scopeFlag = (p: Instalado) => (p.scope === 'project' || p.scope === 'local' ? ` --scope ${p.scope}` : '')

// Tabla de columnas alineadas.
function tabla(rows: string[][]): string[] {
  const widths = rows[0]!.map((_, i) => Math.max(...rows.map(r => r[i]!.length)))
  return rows.map(r => '  ' + r.map((c, i) => (i === r.length - 1 ? c : c.padEnd(widths[i]!))).join('  ').trimEnd())
}

async function informe($: Ctx): Promise<string> {
  const t = T()
  const list = await leerPlugins($)
  const markets = list.isOk ? await leerMarketplaces($) : null
  const copia = await leerCopia($)
  const root = $.plugin.root
  const plugins = list.isOk ? list.plugins : []

  const warnings: string[] = []
  const missing: string[] = []
  const mismatches: string[] = []
  const rows: string[][] = [[`    ${t.colMod}`, t.colState, t.colInstalled, t.colLocal, '']]

  for (const name of PACK) {
    const found = elegir(plugins, name)
    const local = copia.versions.get(name)
    let mark: string
    let state: string
    if (!list.isOk) {
      mark = '[?]'
      state = t.stUnknown
    } else if (!found) {
      if (name === SELF) {
        mark = '[x]'
        state = t.stSelf
      } else {
        mark = '[ ]'
        state = t.stMissing
        missing.push(name)
      }
    } else if (found.errors.length > 0) {
      mark = '[!]'
      state = t.stFailed
    } else if (found.isEnabled) {
      mark = '[x]'
      state = t.stActive
    } else {
      mark = '[ ]'
      state = t.stDisabled
      missing.push(name)
    }
    if (found && found.marketplace === OLD_MARKETPLACE) state += ` (${t.oldTag})`

    const installed = found ? found.version : '—'
    let flag = ''
    if (found && local && found.version !== '?' && local !== '?' && local !== t.unreadable && local !== found.version) {
      flag = '≠'
      const cmp = compararVersiones(local, found.version)
      const id = `${name}@${found.marketplace || MARKETPLACE}`
      mismatches.push(
        cmp === null
          ? t.mismatchOther(name, found.version, local)
          : cmp > 0
            ? t.mismatchLocalNewer(name, found.version, local, id, found.marketplace || MARKETPLACE)
            : t.mismatchLocalOlder(name, found.version, local),
      )
    }
    rows.push([`${mark} ${name}`, state, installed, local ?? t.noLocal, flag])
  }

  const lines: string[] = []
  if (!list.isOk) lines.push(t.listFailed(list.reason), '')
  lines.push(t.packTitle(MARKETPLACE), ...tabla(rows), t.legend)

  // Mods del pack que fallaron al cargar, con el texto del error.
  for (const p of plugins) {
    if (!(PACK as readonly string[]).includes(p.name.toLowerCase()) || p.errors.length === 0) continue
    for (const err of p.errors) warnings.push(t.broken(p.id, err))
    warnings.push(t.brokenHint(p.id))
    if (p.errors.some(e => /manifest|plugin\.json|hooks|module|módulo/i.test(e))) warnings.push(t.brokenManifestHint)
  }
  warnings.push(...mismatches)
  if (list.isOk && missing.length > 0) warnings.push(t.notLoaded(missing.join(', ')))

  // Restos del marketplace antiguo: solo se avisa, no se borra nada.
  const old = plugins.filter(p => p.marketplace === OLD_MARKETPLACE)
  const hasOldMarket = markets?.includes(OLD_MARKETPLACE) ?? false
  if (old.length > 0 || hasOldMarket) {
    warnings.push(t.oldInstalls(OLD_MARKETPLACE, MARKETPLACE))
    for (const p of old) warnings.push(`  - ${t.oldPlugin(p.id)}`)
    if (hasOldMarket) warnings.push(`  - ${t.oldMarket(OLD_MARKETPLACE)}`)
    for (const p of old) warnings.push(`    claude plugin uninstall ${p.id}${scopeFlag(p)}`)
    if (hasOldMarket) warnings.push(`    claude plugin marketplace remove ${OLD_MARKETPLACE}`)
    if (old.length > 0) {
      warnings.push(`  ${t.oldReinstall}`)
      if (!(markets?.includes(MARKETPLACE) ?? false)) warnings.push(`    claude plugin marketplace add ${REPO}`)
      const names = [...new Set(old.map(p => p.name))]
      for (const n of names) warnings.push(`    claude plugin install ${n}@${MARKETPLACE}`)
    }
  }

  lines.push('')
  if (warnings.length > 0) lines.push(t.warnings, ...warnings.map(w => (w.startsWith(' ') ? w : `- ${w}`)))
  else if (list.isOk) lines.push(t.allActive)

  const others = plugins.filter(p => !(PACK as readonly string[]).includes(p.name.toLowerCase()))
  if (list.isOk) {
    lines.push('', t.others)
    if (others.length === 0) lines.push(`  ${t.noOthers}`)
    for (const p of others) lines.push(`  ${isActivo(p) ? t.active : t.inactive}  ${p.id}  v${p.version}`)
  }

  const isRootLocal = copia.dir !== null && dentroDe(root, copia.dir)
  lines.push('', copia.note, t.selfRoot(root, isRootLocal))
  return lines.join('\n')
}

// /mods actualizar: solo muestra comandos; no ejecuta nada que cambie el disco o la instalación.
async function actualizar($: Ctx): Promise<string> {
  const t = T()
  const lines: string[] = [t.updTitle, '']

  const list = await leerPlugins($)
  const installed = list.isOk ? list.plugins.filter(p => p.marketplace === MARKETPLACE && (PACK as readonly string[]).includes(p.name)) : []
  if (installed.length > 0) {
    lines.push(t.updInstalled(MARKETPLACE), `   claude plugin marketplace update ${MARKETPLACE}`)
    for (const p of installed) lines.push(`   claude plugin update ${p.id}${scopeFlag(p)}`)
  } else {
    lines.push(t.updNoInstalled(MARKETPLACE), `   claude plugin marketplace add ${REPO}`)
    for (const n of PACK) lines.push(`   claude plugin install ${n}@${MARKETPLACE}`)
  }
  lines.push('')

  const dir = await carpetaMods($)
  if (dir === null) {
    lines.push(t.updLocalUnknown)
  } else {
    const isWin = esRutaWindows(dir)
    const q = (p: string) => `"${p}"`
    if (await existe($, unir(dir, '.git'))) {
      lines.push(t.updLocalGit(dir), t.updShell(isWin ? 'PowerShell' : 'bash/zsh'), `   git -C ${q(dir)} pull`)
    } else {
      const repoDir = unir(padre(dir), 'portero-claude')
      const hasRepo = await existe($, unir(repoDir, '.git'))
      lines.push(t.updLocalCopy(dir))
      if (!hasRepo) lines.push(t.updCloneFirst(repoDir))
      lines.push(t.updShell(isWin ? 'PowerShell' : 'bash/zsh'))
      if (!hasRepo) lines.push(`   git clone ${REPO_URL} ${q(repoDir)}`)
      lines.push(`   git -C ${q(repoDir)} pull`)
      for (const n of PACK) {
        const from = unir(repoDir, n)
        const to = unir(dir, n)
        lines.push(isWin ? `   robocopy ${q(from)} ${q(to)} /E` : `   mkdir -p ${q(to)} && cp -R ${q(from + '/.')} ${q(to + '/')}`)
      }
      lines.push(t.updOverwrite)
    }
  }
  lines.push('', t.updRestart)
  return lines.join('\n')
}

function ayuda(): string {
  const t = T()
  return [...t.help, '', t.helpNames(PACK.join(', ')), t.helpOptions].join('\n')
}

// /mods on <nombre> y /mods off <nombre>: solo nombres del pack. El cambio vale desde la
// próxima sesión; no se intenta recargar nada.
async function toggle($: Ctx, sub: 'on' | 'off', rest: string[]): Promise<string> {
  const t = T()
  if (rest.length !== 1) return t.usage
  const given = rest[0]!
  const name = given.toLowerCase()
  if (!(PACK as readonly string[]).includes(name)) return t.notPack(given, PACK.join(', '))
  const r = await runClaude($, ['plugin', sub === 'on' ? 'enable' : 'disable', name])
  if (!r.isOk) return t.toggleFailed(sub === 'on', name, r.reason)
  return t.done
}

export const register: Register = (on, options) => {
  const opt = options['modsDir']
  modsDirOption = typeof opt === 'string' && opt.trim() !== '' ? opt : MODS_DIR_DEFAULT
  idioma = idiomaDe(options['idioma'])

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'mods',
      description: T().description,
      argumentHint: idioma === 'en' ? '[on|off <name> | update | help]' : '[on|off <nombre> | actualizar | ayuda]',
    })
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'mods' }, async ($, e) => {
    const [sub, ...rest] = (e.args ?? '').trim().split(/\s+/).filter(Boolean)
    if (sub === undefined) return { text: await informe($) }
    const s = sub.toLowerCase()
    if (s === 'on' || s === 'off') return { text: await toggle($, s, rest) }
    if (s === 'actualizar' || s === 'update') return { text: await actualizar($) }
    if (s === 'ayuda' || s === 'help' || s === '?') return { text: ayuda() }
    return { text: `${T().unknownSub(sub)} ${T().usage}` }
  }).catch(($, e, next) => (next.called ? next(e) : { text: T().reportFailed }))
}
