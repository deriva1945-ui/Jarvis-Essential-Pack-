// Contrato de estado de resumen-sesion.

// Último resumen guardado en esta sesión: el texto, su fecha y el archivo donde se escribió.
export type UltimoResumen = { texto: string; fecha: string; ruta: string }

declare module 'claude-code' {
  interface PluginState {
    'resumen-sesion': {
      // Hora (ms) del último turno terminado; 0 si aún no hay ninguno.
      lastAt: number
      // Intentos automáticos fallidos seguidos (0 o 1).
      fallos: number
      ultimo: Shaped<UltimoResumen | null>
    }
  }
}
