export type Fase = 'idle' | 'procesando' | 'ejecutando' | 'delegando' | 'completado'

export type Estado = {
  fase: Fase
  // Herramienta en curso, o "<subagentType>" durante la delegación.
  detalle: string
  // Modelo de la sesión (o el último que contestó en el hilo principal).
  modelo: string
  // Modelo del subagente mientras se delega; vacío fuera de la delegación.
  modeloDelegado: string
  // Resumen del turno terminado.
  tokens: number
  coste: number
  // Coste acumulado de la sesión al enviar el prompt, para sacar el del turno.
  costeInicio: number
}

// Tokens por familia de modelo en el turno en curso (hilo principal + subagentes).
export type Reparto = Record<string, number>

export type Contexto = { tokens: number; window: number; percent: number }

declare module 'claude-code' {
  interface PluginState {
    'jarvis-banda': {
      estado: Shaped<Estado>
      reparto: Shaped<Reparto>
      contexto: Shaped<Contexto | null>
    }
  }
}
