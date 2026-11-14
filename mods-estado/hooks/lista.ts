// Lectura de la salida de "claude plugin list" y "claude plugin marketplace list".
// Solo funciones puras: no ejecutan nada ni tocan el disco.

// Un plugin instalado tal como lo cuenta "claude plugin list".
export type Instalado = {
  id: string // nombre@marketplace
  name: string
  marketplace: string
  version: string // "?" si no se sabe
  scope: string // user, project, local, synced… ("" si no se sabe)
  isEnabled: boolean
  errors: string[] // mensajes de error al cargar
  status: string // texto de Status (solo en la salida de texto)
}

// Activo: habilitado y sin errores al cargar.
export const isActivo = (p: Instalado) => p.isEnabled && p.errors.length === 0

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)

function partirId(id: string): { name: string; marketplace: string } {
  const at = id.lastIndexOf('@')
  return at > 0 ? { name: id.slice(0, at), marketplace: id.slice(at + 1) } : { name: id, marketplace: '' }
}

// Salida de "claude plugin list --json": un array de { id, version, scope, enabled, errors? }.
// Devuelve null si no es ese formato.
export function parseListaJson(stdout: string): Instalado[] | null {
  let data: unknown
  try {
    data = JSON.parse(stdout.trim())
  } catch {
    return null
  }
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    data = (data as { installed?: unknown }).installed
  }
  if (!Array.isArray(data)) return null
  const out: Instalado[] = []
  for (const item of data) {
    if (item === null || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const id = str(o['id'])
    if (!id) continue
    const { name, marketplace } = partirId(id)
    const errs = Array.isArray(o['errors']) ? o['errors'].filter((x): x is string => typeof x === 'string') : []
    const version = str(o['version'])
    out.push({
      id,
      name,
      marketplace,
      version: version && version !== 'unknown' ? version : '?',
      scope: str(o['scope']) ?? '',
      isEnabled: o['enabled'] !== false,
      errors: errs,
      status: '',
    })
  }
  return out
}

// Salida de texto de "claude plugin list":
//   > nombre@marketplace
//     Version: 1.2.3
//     Scope: user
//     Status: ✘ failed to load
//     Error: mensaje
export function parseListaTexto(stdout: string): Instalado[] {
  const plugins: Instalado[] = []
  let current: Instalado | undefined
  for (const raw of stdout.split(/\r?\n/)) {
    const line = raw.trim()
    const head = /^[>❯›»]\s*(\S+?)(?::\s+(.*))?$/.exec(line)
    if (head) {
      const id = head[1]!.replace(/:$/, '')
      const { name, marketplace } = partirId(id)
      current = { id, name, marketplace, version: '?', scope: '', isEnabled: false, errors: [], status: '' }
      // "> origen: ✘ mensaje": un plugin que no llegó a cargarse.
      if (head[2]) current.errors.push(head[2].replace(/^[✘×x]\s*/, '').trim())
      plugins.push(current)
      continue
    }
    if (!current) continue
    const m = /^(Version|Scope|Status|Error):\s*(.*)$/i.exec(line)
    if (!m) continue
    const key = m[1]!.toLowerCase()
    const value = m[2]!.trim()
    if (key === 'version') current.version = value && value !== 'unknown' ? value : '?'
    else if (key === 'scope') current.scope = value
    else if (key === 'error') current.errors.push(value)
    else {
      current.status = value
      const s = value.toLowerCase()
      current.isEnabled = /loaded|enabled|failed|error/.test(s) && !/disabled/.test(s)
      if (/failed|error/.test(s) && current.errors.length === 0) current.errors.push(value.replace(/^\S+\s*/, ''))
    }
  }
  // Un "Status: failed" sin línea Error deja su propio texto; si luego llegó un Error, sobra.
  for (const p of plugins) {
    if (p.errors.length > 1 && /failed|error/i.test(p.status)) {
      const own = p.status.replace(/^\S+\s*/, '')
      p.errors = p.errors.filter((e, i) => i > 0 || e !== own)
    }
  }
  return plugins
}

// Nombres de "claude plugin marketplace list --json" (o de su salida de texto).
export function parseMarketplaces(stdout: string): string[] {
  try {
    const data: unknown = JSON.parse(stdout.trim())
    if (Array.isArray(data)) {
      return data
        .map(x => (x !== null && typeof x === 'object' ? str((x as Record<string, unknown>)['name']) : str(x)))
        .filter((x): x is string => !!x)
    }
  } catch {
    // salida de texto
  }
  const names: string[] = []
  for (const raw of stdout.split(/\r?\n/)) {
    const m = /^\s*[>❯›»]\s*(\S+)/.exec(raw)
    if (m) names.push(m[1]!)
  }
  return names
}

// Versión leída del plugin.json de la copia local, o null si no la hay.
export function versionDeManifest(text: string): string | null {
  try {
    const data: unknown = JSON.parse(text)
    if (data !== null && typeof data === 'object') {
      const v = (data as { version?: unknown }).version
      if (typeof v === 'string' && v.trim() !== '') return v.trim()
    }
  } catch {
    // manifiesto ilegible
  }
  return null
}

// Compara dos versiones "x.y.z": negativo si a < b, 0 si iguales, positivo si a > b.
// Devuelve null si alguna no es numérica.
export function compararVersiones(a: string, b: string): number | null {
  const parse = (v: string) => {
    const m = /^v?(\d+(?:\.\d+)*)/.exec(v.trim())
    return m ? m[1]!.split('.').map(Number) : null
  }
  const pa = parse(a)
  const pb = parse(b)
  if (!pa || !pb) return null
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}
