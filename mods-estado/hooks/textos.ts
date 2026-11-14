// Textos de /mods en español y en inglés (opción idioma de userConfig).

export type Idioma = 'es' | 'en'

export const idiomaDe = (v: unknown): Idioma => (v === 'en' ? 'en' : 'es')

const es = {
  usage: 'Uso: /mods, /mods on <nombre>, /mods off <nombre>, /mods actualizar o /mods ayuda.',
  unknownSub: (s: string) => `Subcomando desconocido: "${s}".`,
  done: 'Hecho. El cambio se aplica en la próxima sesión; reinicia Claude Code.',
  notPack: (given: string, allowed: string) => `"${given}" no es un mod del pack. Nombres permitidos: ${allowed}.`,
  toggleFailed: (on: boolean, name: string, reason: string) =>
    `No se pudo ${on ? 'activar' : 'desactivar'} ${name}: ${reason}`,
  exitCode: (cmd: string, code: number, detail: string) =>
    `"${cmd}" terminó con código ${code}${detail ? `: ${detail}` : ''}`,
  cannotRun: (cmd: string, failures: string) =>
    `no se pudo ejecutar "${cmd}" (${failures}). ` +
    'Comprueba que claude está en el PATH y que el mod tiene permiso para ejecutar procesos.',
  reportFailed: 'mods-estado: no se pudo preparar el informe de /mods.',
  description: 'Estado del pack; on/off <nombre>, actualizar, ayuda',

  // Tabla
  packTitle: (mp: string) => `Pack ${mp}:`,
  colMod: 'Mod',
  colState: 'Estado',
  colInstalled: 'Instalada',
  colLocal: 'Copia local',
  stActive: 'activo',
  stDisabled: 'desactivado',
  stFailed: 'falló al cargar',
  stMissing: 'no instalado',
  stUnknown: 'desconocido',
  stSelf: 'en uso',
  noLocal: '—',
  unreadable: 'ilegible',
  legend: 'Marcas: [x] activo · [ ] desactivado o no instalado · [!] falló al cargar · [?] sin datos · ≠ la copia local no coincide con la instalada',
  listFailed: (reason: string) => `No se pudo leer la lista de plugins: ${reason}`,
  others: 'Otros plugins instalados:',
  noOthers: '(ninguno)',
  active: 'activo',
  inactive: 'inactivo',
  oldTag: 'marketplace antiguo',

  // Copia local
  localNone: (dir: string) => `${dir}: sin copia local`,
  localUnknownHome: (dir: string) =>
    `${dir}: sin copia local (no se sabe cuál es tu carpeta de usuario; pon una ruta absoluta en modsDir)`,
  localUnreadable: (dir: string, err: string) => `${dir}: sin copia local (no se pudo leer: ${err})`,
  localCount: (dir: string, n: number) => `Copia local: ${dir} (${n} mod(s) del pack)`,
  selfRoot: (root: string, isLocal: boolean) =>
    `Este mod (mods-estado) se carga desde ${root}${isLocal ? ' (copia local)' : ''}.`,

  // Avisos
  warnings: 'Avisos:',
  warnPrefix: 'Aviso:',
  allActive: 'Todos los mods del pack están activos.',
  notLoaded: (names: string) =>
    `Del pack no están cargados: ${names}. (Un mod cargado con --plugin-dir no aparece en "claude plugin list".)`,
  broken: (id: string, err: string) => `${id} falló al cargar: ${err}`,
  brokenHint: (id: string) =>
    `  Sugerencia: actualízalo con "claude plugin update ${id}" y reinicia Claude Code. ` +
    `Si sigue fallando, reinstálalo ("claude plugin uninstall ${id}" y "claude plugin install ${id}") ` +
    'o mira el detalle con "claude --debug".',
  brokenManifestHint: '  El error apunta al manifiesto o al módulo: comprueba que la copia está completa (plugin.json y hooks/).',
  mismatchLocalNewer: (name: string, inst: string, local: string, id: string, mp: string) =>
    `${name}: instalada ${inst}, copia local ${local} (la copia local es más nueva). ` +
    `Actualiza la instalada: "claude plugin marketplace update ${mp}" y "claude plugin update ${id}".`,
  mismatchLocalOlder: (name: string, inst: string, local: string) =>
    `${name}: instalada ${inst}, copia local ${local} (la copia local es más antigua). Escribe /mods actualizar para ver cómo actualizarla.`,
  mismatchOther: (name: string, inst: string, local: string) =>
    `${name}: instalada ${inst}, copia local ${local} (no coinciden). Escribe /mods actualizar para ver cómo actualizarla.`,
  oldInstalls: (old: string, cur: string) =>
    `Hay restos del marketplace antiguo "${old}" (el pack ahora se llama "${cur}"). ` +
    'No se borra nada automáticamente; para limpiarlos, revisa y ejecuta en una terminal:',
  oldPlugin: (id: string) => `instalado desde el marketplace antiguo: ${id}`,
  oldMarket: (old: string) => `marketplace antiguo configurado: ${old}`,
  oldReinstall: 'Después, instala de nuevo los que uses desde el marketplace actual:',

  // /mods actualizar
  updTitle: 'Cómo actualizar el pack (no se ejecuta nada; revisa los comandos y cópialos en una terminal):',
  updInstalled: (mp: string) => `1. Mods instalados desde el marketplace ${mp}:`,
  updNoInstalled: (mp: string) => `1. No hay mods del pack instalados desde ${mp}; si los quieres instalar:`,
  updLocalGit: (dir: string) => `2. Copia local en ${dir}: es un clon de git del repo, basta con actualizarlo:`,
  updLocalCopy: (dir: string) => `2. Copia local en ${dir}: actualiza un clon del repo y copia cada mod encima:`,
  updLocalUnknown:
    '2. Copia local: no se sabe cuál es tu carpeta de usuario; pon una ruta absoluta en la opción modsDir y vuelve a escribir /mods actualizar.',
  updCloneFirst: (dir: string) => `   (${dir} no existe todavía: el primer comando lo clona.)`,
  updOverwrite: '   La copia sobrescribe los archivos de la copia local que se llamen igual (tus cambios en ellos se pierden); no borra nada.',
  updShell: (shell: string) => `   En ${shell}:`,
  updRestart: '3. Reinicia Claude Code para cargar las versiones nuevas y escribe /mods para comprobarlo.',

  // /mods ayuda
  help: [
    'Subcomandos de /mods:',
    '  /mods                  tabla del pack: estado, versión instalada, versión de la copia local y avisos',
    '  /mods on <nombre>      activa un mod del pack (claude plugin enable); vale desde la próxima sesión',
    '  /mods off <nombre>     desactiva un mod del pack (claude plugin disable); vale desde la próxima sesión',
    '  /mods actualizar       muestra los comandos para actualizar el pack y la copia local, sin ejecutarlos',
    '  /mods ayuda            esta ayuda',
  ],
  helpNames: (names: string) => `Mods del pack: ${names}.`,
  helpOptions: 'Opciones (claude plugin configure mods-estado@jarvis-essential-pack): idioma (es o en) y modsDir (carpeta de la copia local).',
}

type Textos = typeof es

const en: Textos = {
  usage: 'Usage: /mods, /mods on <name>, /mods off <name>, /mods update or /mods help.',
  unknownSub: s => `Unknown subcommand: "${s}".`,
  done: 'Done. The change applies from the next session; restart Claude Code.',
  notPack: (given, allowed) => `"${given}" is not a pack mod. Allowed names: ${allowed}.`,
  toggleFailed: (on, name, reason) => `Could not ${on ? 'enable' : 'disable'} ${name}: ${reason}`,
  exitCode: (cmd, code, detail) => `"${cmd}" exited with code ${code}${detail ? `: ${detail}` : ''}`,
  cannotRun: (cmd, failures) =>
    `could not run "${cmd}" (${failures}). ` +
    'Check that claude is on the PATH and that the mod may run processes.',
  reportFailed: 'mods-estado: could not build the /mods report.',
  description: 'Pack status; on/off <name>, update, help',

  packTitle: mp => `Pack ${mp}:`,
  colMod: 'Mod',
  colState: 'State',
  colInstalled: 'Installed',
  colLocal: 'Local copy',
  stActive: 'active',
  stDisabled: 'disabled',
  stFailed: 'failed to load',
  stMissing: 'not installed',
  stUnknown: 'unknown',
  stSelf: 'in use',
  noLocal: '—',
  unreadable: 'unreadable',
  legend: 'Marks: [x] active · [ ] disabled or not installed · [!] failed to load · [?] no data · ≠ the local copy does not match the installed one',
  listFailed: reason => `Could not read the plugin list: ${reason}`,
  others: 'Other installed plugins:',
  noOthers: '(none)',
  active: 'active',
  inactive: 'inactive',
  oldTag: 'old marketplace',

  localNone: dir => `${dir}: no local copy`,
  localUnknownHome: dir => `${dir}: no local copy (your user folder is unknown; set an absolute path in modsDir)`,
  localUnreadable: (dir, err) => `${dir}: no local copy (could not read it: ${err})`,
  localCount: (dir, n) => `Local copy: ${dir} (${n} pack mod(s))`,
  selfRoot: (root, isLocal) => `This mod (mods-estado) is loaded from ${root}${isLocal ? ' (local copy)' : ''}.`,

  warnings: 'Warnings:',
  warnPrefix: 'Warning:',
  allActive: 'Every pack mod is active.',
  notLoaded: names =>
    `Pack mods not loaded: ${names}. (A mod loaded with --plugin-dir does not show in "claude plugin list".)`,
  broken: (id, err) => `${id} failed to load: ${err}`,
  brokenHint: id =>
    `  Suggestion: update it with "claude plugin update ${id}" and restart Claude Code. ` +
    `If it still fails, reinstall it ("claude plugin uninstall ${id}" then "claude plugin install ${id}") ` +
    'or see the details with "claude --debug".',
  brokenManifestHint: '  The error points at the manifest or the module: check the copy is complete (plugin.json and hooks/).',
  mismatchLocalNewer: (name, inst, local, id, mp) =>
    `${name}: installed ${inst}, local copy ${local} (the local copy is newer). ` +
    `Update the installed one: "claude plugin marketplace update ${mp}" then "claude plugin update ${id}".`,
  mismatchLocalOlder: (name, inst, local) =>
    `${name}: installed ${inst}, local copy ${local} (the local copy is older). Type /mods update to see how to update it.`,
  mismatchOther: (name, inst, local) =>
    `${name}: installed ${inst}, local copy ${local} (they differ). Type /mods update to see how to update it.`,
  oldInstalls: (old, cur) =>
    `Leftovers from the old "${old}" marketplace (the pack is now "${cur}"). ` +
    'Nothing is deleted automatically; to clean them up, review and run in a terminal:',
  oldPlugin: id => `installed from the old marketplace: ${id}`,
  oldMarket: old => `old marketplace configured: ${old}`,
  oldReinstall: 'Then install the ones you use again from the current marketplace:',

  updTitle: 'How to update the pack (nothing is run; review the commands and paste them into a terminal):',
  updInstalled: mp => `1. Mods installed from the ${mp} marketplace:`,
  updNoInstalled: mp => `1. No pack mods are installed from ${mp}; to install them:`,
  updLocalGit: dir => `2. Local copy in ${dir}: it is a git clone of the repo, just update it:`,
  updLocalCopy: dir => `2. Local copy in ${dir}: update a clone of the repo and copy each mod over it:`,
  updLocalUnknown:
    '2. Local copy: your user folder is unknown; set an absolute path in the modsDir option and type /mods update again.',
  updCloneFirst: dir => `   (${dir} does not exist yet: the first command clones it.)`,
  updOverwrite: '   The copy overwrites local-copy files with the same name (your changes to them are lost); it deletes nothing.',
  updShell: shell => `   In ${shell}:`,
  updRestart: '3. Restart Claude Code to load the new versions and type /mods to check.',

  help: [
    '/mods subcommands:',
    '  /mods                  pack table: state, installed version, local copy version and warnings',
    '  /mods on <name>        enables a pack mod (claude plugin enable); applies from the next session',
    '  /mods off <name>       disables a pack mod (claude plugin disable); applies from the next session',
    '  /mods update           shows the commands to update the pack and the local copy, without running them',
    '  /mods help             this help',
  ],
  helpNames: names => `Pack mods: ${names}.`,
  helpOptions: 'Options (claude plugin configure mods-estado@jarvis-essential-pack): idioma (es or en) and modsDir (local copy folder).',
}

export const textos = (idioma: Idioma): Textos => (idioma === 'en' ? en : es)
