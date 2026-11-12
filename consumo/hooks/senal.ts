// Lógica de señal y lectura de datos.js de la página. Se incrusta en el HTML con toString()
// (ver page.ts), así que cada función es autónoma: sin importar nada, sin usar otras funciones
// ni constantes de fuera, y sin acentos graves, dólar-llave ni barras invertidas.
// Latido del plugin cada 3 s y recarga de la página cada 1 s: hacen falta 10 s seguidos
// sin latido nuevo para avisar de "sin señal".

export type SenalState = { loadOk: boolean; fails: number; beatSeen: number; lastBeat: unknown; started: number }
export type Senal = { estado: 'ok' | 'espera' | 'off'; alerta: boolean; texto: string; aviso: string; segundos: number | null }

export function nuevoEstado(now: number): SenalState {
  return { loadOk: false, fails: 0, beatSeen: 0, lastBeat: null, started: now }
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
    return false
  }
  st.fails = 0
  st.loadOk = true
  const b = o.latido || o.actualizado || 0
  if (b !== st.lastBeat) {
    // Un datos.js que ya era viejo al abrir la página (sesión cerrada) no cuenta como latido.
    const viejo = st.lastBeat === null && typeof b === 'number' && b > 1e12 && now - b > STALE
    st.lastBeat = b
    if (!viejo) st.beatSeen = now
  }
  return true
}

export function alFallar(st: SenalState): void {
  st.fails++
}

export function senal(st: SenalState, now: number): Senal {
  const STALE = 10000
  const age = now - (st.beatSeen || st.started)
  const ok = !!st.beatSeen && age <= STALE
  const espera = !st.beatSeen && age <= STALE
  const secs = st.beatSeen ? Math.round((now - st.beatSeen) / 1000) : null
  const texto = ok ? 'En línea' : espera ? 'Esperando' : 'Sin señal'
  const aviso = st.fails >= 3 ? 'datos.js no responde' : secs !== null ? 'Sin señal hace ' + secs + ' s' : 'Sin datos nuevos'
  return { estado: ok ? 'ok' : espera ? 'espera' : 'off', alerta: !ok && !espera, texto, aviso, segundos: secs }
}

// El bloque que se pega en la página: cada función como expresión con su nombre de página.
export const LOGICA = [
  'var nuevoEstado=(' + String(nuevoEstado) + ');',
  'var valido=(' + String(valido) + ');',
  'var alCargar=(' + String(alCargar) + ');',
  'var alFallar=(' + String(alFallar) + ');',
  'var senal=(' + String(senal) + ');',
].join('\n')
