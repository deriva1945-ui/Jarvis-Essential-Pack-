// Moneda del HUD (opciones moneda y tipoCambio). El coste llega de Claude Code en dólares y se guarda así
// (libro, historial, comparativa, datos.js): solo se convierte al mostrarlo, en la página, y en un solo sitio
// (dinero() de page.ts, que llama a convertirMoneda una vez por cifra).
// tipoCambio: euros que vale un dólar (0.92 = 1 USD son 0,92 €). Es un valor de referencia: el usuario lo actualiza.
// Funciones autónomas (sin variables de fuera): se pegan en la página con toString(), igual que densidadDe y senal.ts.
// Sin acentos graves, dólar-llave ni barras invertidas.

// Dólares a la moneda del HUD. Con USD (o un tipo de cambio que no vale) devuelve los mismos dólares.
export function convertirMoneda(usd: number, moneda: string, tipoCambio: number): number {
  var v = Number(usd) || 0
  if (moneda !== 'EUR') return v
  var t = Number(tipoCambio)
  return t > 0 && isFinite(t) ? v * t : v
}

// Importe ya convertido, con el formato de moneda del idioma: es-ES 1.234,56 € (símbolo detrás), en-US €1,234.56.
// Menos de 1 (en valor absoluto): 4 decimales (0,1234 €; 0,1030 €), o 2 si con 2 ya es exacto (0,92 €; 0,10 €).
// Nunca 3 decimales sueltos. Desde 1: 2 decimales.
export function formatoMoneda(valor: number, moneda: string, locale: string): string {
  var v = Number(valor) || 0
  var cur = moneda === 'USD' ? 'USD' : 'EUR'
  var loc = locale === 'en-US' ? 'en-US' : 'es-ES'
  var d = Math.abs(v) < 1 && Math.round(v * 1e4) !== Math.round(v * 100) * 100 ? 4 : 2
  var o: Intl.NumberFormatOptions = { style: 'currency', currency: cur, minimumFractionDigits: d, maximumFractionDigits: d }
  try {
    // always: agrupa tambien los miles en es-ES (sin esto deja 1234,56).
    return new Intl.NumberFormat(loc, Object.assign({ useGrouping: 'always' as unknown as boolean }, o)).format(v)
  } catch (e) {
    return new Intl.NumberFormat(loc, o).format(v)
  }
}

// Símbolo de la moneda para cabeceras, leyendas y la etiqueta del botón: € o US$ (USD solo con moneda = USD).
export function simboloMoneda(moneda: string): string {
  return moneda === 'USD' ? 'US$' : '€'
}

// La otra moneda: lo que hace el botón de la cabecera (EUR pasa a USD y USD a EUR).
export function otraMoneda(moneda: string): 'EUR' | 'USD' {
  return moneda === 'USD' ? 'EUR' : 'USD'
}

// El bloque que se pega en la página.
export const MONEDA_JS = [
  'var convertirMoneda=(' + String(convertirMoneda) + ');',
  'var formatoMoneda=(' + String(formatoMoneda) + ');',
  'var simboloMoneda=(' + String(simboloMoneda) + ');',
  'var otraMoneda=(' + String(otraMoneda) + ');',
].join('\n')
