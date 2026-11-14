export type Fase = 'esperando' | 'procesando' | 'pensando' | 'ejecutando' | 'delegando' | 'permiso' | 'error'

export type Idioma = 'es' | 'en'

export type Modo = 'completo' | 'compacto' | 'oculto'

export type Estado = {
  fase: Fase
  // Herramienta en curso, la que pide permiso o la que falló.
  herramienta: string
  // Tipo de subagente mientras se delega; vacío fuera de la delegación.
  agente: string
  // Modelo de la sesión (o el último que contestó en el hilo principal).
  modelo: string
  // Modelo del subagente mientras se delega; vacío fuera de la delegación.
  modeloDelegado: string
  // Porcentaje de contexto usado (0-100); -1 mientras no se conoce.
  contexto: number
  // true durante el pulso que sigue a un cambio de estado.
  brillo: boolean
}

// Lo que /banda cambia solo en esta sesión; vacío = lo que diga la configuración.
export type Ajustes = {
  idioma: Idioma | ''
  modo: Modo | ''
}

declare module 'claude-code' {
  interface PluginState {
    'jarvis-banda': {
      estado: Shaped<Estado>
      ajustes: Shaped<Ajustes>
    }
  }
}
