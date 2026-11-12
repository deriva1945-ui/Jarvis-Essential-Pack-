export type Fase = 'idle' | 'procesando' | 'ejecutando' | 'delegando'

export type Estado = {
  fase: Fase
  // Herramienta en curso, o el tipo de subagente durante la delegación.
  detalle: string
  // Modelo de la sesión (o el último que contestó en el hilo principal).
  modelo: string
  // Modelo del subagente mientras se delega; vacío fuera de la delegación.
  modeloDelegado: string
}

declare module 'claude-code' {
  interface PluginState {
    'jarvis-banda': {
      estado: Shaped<Estado>
    }
  }
}
