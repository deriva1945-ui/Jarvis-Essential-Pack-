// Lógica de señal y lectura de datos.js de la página. Se incrusta en el HTML con toString()
// (ver page.ts), así que cada función es autónoma: sin importar nada, sin usar otras funciones
// ni constantes de fuera, y sin acentos graves, dólar-llave ni barras invertidas.
// Latido del plugin cada 3 s y recarga de la página cada 1 s: hacen falta 10 s seguidos
// sin latido nuevo, y además 3 lecturas seguidas sin latido nuevo, para avisar de "sin señal".
// Así una lectura fallida suelta (archivo a medio escribir, ventana en segundo plano que lee
// una vez por minuto) no enciende el aviso, y un latido nuevo lo apaga en la misma lectura.

// fails: lecturas fallidas seguidas (datos.js no carga o no es válido); vuelve a 0 con un dato válido.
// misses: lecturas seguidas sin latido nuevo (fallidas, o válidas con el mismo latido); vuelve a 0 con un latido nuevo.
export type SenalState = { loadOk: boolean; fails: number; misses: number; beatSeen: number; lastBeat: unknown; started: number }
export type Senal = { estado: 'ok' | 'espera' | 'off'; alerta: boolean; texto: string; aviso: string; segundos: number | null }

export function nuevoEstado(now: number): SenalState {
  return { loadOk: false, fails: 0, misses: 0, beatSeen: 0, lastBeat: null, started: now }
}

// Un datos.js a medio escribir no define CONSUMO (error de sintaxis) o lo deja sin campos: se descarta.
export function valido(d: unknown): boolean {
  const o = d as { contexto?: unknown; coste?: unknown } | null
  return !!o && typeof o === 'object' && !!o.contexto && typeof o.contexto === 'object' && typeof o.coste === 'number'
}

export function alCargar(st: SenalState, d: unknown, now: number): boolean {
  const STALE = 10000
  const o = d as { contexto?: unknown; coste?: unknown; latido?: number; actualizado?: number } | null
  const ok = !!o && typeof o === 'object' && !!o.contexto && typeof o.contexto === 'object' && typeof o.coste === 'number'
  if (!ok || !o) {
    st.fails++
    st.misses = (st.misses || 0) + 1
    return false
  }
  st.fails = 0
  st.loadOk = true
  const b = o.latido || o.actualizado || 0
  let nuevo = false
  if (b !== st.lastBeat) {
    // Un datos.js que ya era viejo al abrir la página (sesión cerrada) no cuenta como latido.
    const viejo = st.lastBeat === null && typeof b === 'number' && b > 1e12 && now - b > STALE
    st.lastBeat = b
    if (!viejo) {
      st.beatSeen = now
      nuevo = true
    }
  }
  st.misses = nuevo ? 0 : (st.misses || 0) + 1
  return true
}

export function alFallar(st: SenalState): void {
  st.fails++
  st.misses = (st.misses || 0) + 1
}

export function senal(st: SenalState, now: number): Senal {
  const STALE = 10000
  // Lecturas seguidas sin latido nuevo que hacen falta para dar la señal por perdida.
  const MIN_FALLOS = 3
  const age = now - (st.beatSeen || st.started)
  const fresco = age <= STALE
  const ok = !!st.beatSeen && fresco
  const espera = !st.beatSeen && fresco
  // Con señal vista antes y latido viejo, pero menos de MIN_FALLOS lecturas seguidas sin latido:
  // todavía no se avisa (puede ser una lectura suelta tras una pausa larga del navegador).
  const dudosa = !!st.beatSeen && !fresco && (st.misses || 0) < MIN_FALLOS
  const off = !ok && !espera && !dudosa
  const secs = st.beatSeen ? Math.round((now - st.beatSeen) / 1000) : null
  const texto = ok ? 'En línea' : espera ? 'Esperando' : dudosa ? 'Comprobando' : 'Sin señal'
  const aviso = st.fails >= MIN_FALLOS ? 'datos.js no responde' : secs !== null ? 'Sin señal hace ' + secs + ' s' : 'Sin datos nuevos'
  return { estado: ok ? 'ok' : off ? 'off' : 'espera', alerta: off, texto, aviso, segundos: secs }
}

// El bloque que se pega en la página: cada función como expresión con su nombre de página.
export const LOGICA = [
  'var nuevoEstado=(' + String(nuevoEstado) + ');',
  'var valido=(' + String(valido) + ');',
  'var alCargar=(' + String(alCargar) + ');',
  'var alFallar=(' + String(alFallar) + ');',
  'var senal=(' + String(senal) + ');',
].join('\n')
