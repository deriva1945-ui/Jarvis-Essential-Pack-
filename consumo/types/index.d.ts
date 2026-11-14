export type AgentRow = { model: string; input: number; output: number; cacheRead: number; turns: number }
export type ModelRow = { input: number; output: number; cacheRead: number; cacheWrite: number; turns: number }
// Un turno del historial: quién, con qué modelo, cuánto y lo que subió el contador de coste.
export type TurnRec = {
  // turnId del motor; falta en historiales guardados por la versión anterior.
  id?: string
  at: number
  agent: string
  model: string
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  cost: number | null
}
// Acumulado por modelo para la comparativa Haiku frente a Opus. Tokens por tipo, por separado.
// costTurns / costTokens / cost: solo los turnos con coste conocido (el primero tras arrancar puede no tenerlo),
// para que el coste por token no mezcle tokens sin coste.
export type CompRow = {
  turns: number
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  costTurns: number
  costTokens: number
  cost: number
}
export type Familia = 'haiku' | 'opus' | 'fable' | 'sonnet' | 'otro'
// Bloque "comparativa" de datos.js: cuánto habría costado la sesión si el trabajo enviado a Haiku hubiera ido a Opus.
// Sin datos suficientes, disponible es false, motivo lo explica y las cifras estimadas son null.
export type Comparativa = {
  disponible: boolean
  motivo?: string
  costeReal: number
  costeOpusEstimado: number | null
  ahorro: number | null
  ahorroPct: number | null
  tokensPorModelo: { familia: Familia; tokens: number; coste: number }[]
}
export type CtxSnap = { tokens: number; window: number; percent: number }

// Colocación del HUD (opciones disposicion, orden, tamanos, escala, ocultos y ventana; ver disposicion.ts), ya validada.
// Va en datos.js como "vista"; ventana no, porque solo la usa el mod al abrir Edge.
export type HudDisposicion =
  | 'auto'
  | 'columna'
  | 'franja'
  | 'tres-columnas'
  | 'nucleo-central'
  | 'barra-lateral'
  | 'barra-inferior'
  | 'mosaico'
  | 'foco'
// Paneles que se colocan: historico es el bloque Acumulado; historial, los últimos turnos.
export type HudLugar = 'contexto' | 'coste' | 'comparativa' | 'reparto' | 'agentes' | 'plan' | 'historico' | 'historial' | 'grafica'
export type HudTamano = 'pequeno' | 'normal' | 'grande'
export type HudVentana = 'auto' | 'pequena' | 'mediana' | 'grande' | 'completa'
export type HudVista = {
  disposicion: HudDisposicion
  // Los nueve paneles, en el orden en que se muestran.
  orden: HudLugar[]
  // Solo los paneles con tamaño pedido; el resto va en normal.
  tamanos: Partial<Record<HudLugar, HudTamano>>
  // De 0.8 a 1.4: multiplica texto y espaciado (el texto nunca baja de 14 px).
  escala: number
  ocultos: HudLugar[]
}
// Libro del coste y de los turnos vistos, en un solo átomo para que update() lo cambie de una vez:
// last: último valor del contador de coste de la sesión (null si aún no se conoce);
// base: lo acumulado antes de que el contador volviera a empezar (/clear, reanudar);
// ids: turnos ya contados (para no duplicar); turn: lo que decidió la última actualización.
export type Ledger = {
  last: number | null
  base: number
  ids: string[]
  turn: { id: string; dup: boolean; cost: number | null } | null
}

// Plan de Claude (TaskCreate / TaskUpdate): las tareas en el orden en que se crearon.
export type PlanEstado = 'pending' | 'in_progress' | 'completed'
export type PlanState = { orden: string[]; tareas: Record<string, { titulo: string; estado: PlanEstado }> }

// Personalización del HUD (userConfig de plugin.json), ya validada. Va en datos.js como "config":
// la página la lee y no la cambia.
export type HudTema = 'mark-ii' | 'mark-l' | 'stark' | 'hibrido' | 'claro' | 'natural'
export type HudIdioma = 'es' | 'en'
// Moneda en la que el HUD muestra el coste (la inicial: el botón de la cabecera la cambia). El coste se guarda siempre
// en dólares; la página convierte al mostrar.
export type HudMoneda = 'USD' | 'EUR'
export type HudPanel = 'contexto' | 'coste' | 'reparto' | 'agentes' | 'historial' | 'grafica' | 'comparativa' | 'plan'
export type HudConfig = {
  tema: HudTema
  // Color de acento en hex, en minúsculas (#rgb o #rrggbb).
  acento: string
  idioma: HudIdioma
  // Segundos entre lecturas de datos.js, de 1 a 5.
  actualizacion: number
  // Paneles visibles, en el orden fijo del HUD.
  paneles: HudPanel[]
  // Moneda inicial del HUD y euros por dólar (valor de referencia que el usuario actualiza; solo se usa con EUR).
  moneda: HudMoneda
  tipoCambio: number
}

// Histórico entre sesiones (historico.json en la carpeta de datos). Solo cifras y nombres de modelos y de tipos de agente.
// Opciones historico (true por defecto) y retencionDias (365 por defecto), ya validadas.
export type HistoricoConfig = { activo: boolean; retencionDias: number }
// Cifras acumuladas: coste en USD (suma del coste de los turnos), tokens por tipo y turnos.
export type Cifras = { coste: number; entrada: number; salida: number; cache: number; cacheEscritura: number; turnos: number }
export type DiaHist = Cifras & { modelos: Record<string, Cifras> }
// Una sesión: id del motor, inicio y fin (ms), coste, turnos, modelo principal (el de más turnos) y turnos por modelo.
export type SesionHist = { id: string; inicio: number; fin: number; coste: number; turnos: number; modelo: string; modelos: Record<string, number> }
export type Historico = {
  version: 1
  // Primer uso (ms); null sin turnos.
  desde: number | null
  actualizado: number
  // Desde el primer uso, con el reparto por modelo y por tipo de agente ("principal" o el subagentType).
  total: Cifras & { modelos: Record<string, Cifras>; agentes: Record<string, Cifras> }
  // Días que salieron de la retención, sumados (hasta: el último de ellos).
  anteriores: Cifras & { dias: number; hasta: string | null }
  // Por día local, AAAA-MM-DD.
  dias: Record<string, DiaHist>
  // Últimas sesiones, de la más antigua a la más nueva; las que pasan del límite se suman en sesionesAnteriores.
  sesiones: SesionHist[]
  sesionesAnteriores: { sesiones: number; coste: number; turnos: number }
  // Turnos ya sumados (sesión:turno), para no contar dos veces el mismo.
  turnos: string[]
}
// Un turno que se suma al histórico.
export type TurnoHist = {
  id: string
  sesion: string
  // Inicio de la sesión (ms) y hora del turno.
  inicio: number
  at: number
  modelo: string
  agente: string
  entrada: number
  salida: number
  cache: number
  cacheEscritura: number
  coste: number | null
}
// Bloque "acumulado" de datos.js (null con historico desactivado o sin poder leer el archivo).
export type AcumCifras = { coste: number; turnos: number; entrada: number; salida: number; cache: number }
export type Acumulado = {
  desde: number | null
  total: AcumCifras
  hoy: AcumCifras
  semana: AcumCifras
  dias: number
  sesionesTotales: number
  sesiones: { inicio: number; fin: number; duracion: number; coste: number; turnos: number; modelo: string; actual: boolean }[]
}

declare module 'claude-code' {
  interface PluginState {
    'consumo': {
      rows: Shaped<Record<string, AgentRow>>
      models: Shaped<Record<string, ModelRow>>
      hist: Shaped<TurnRec[]>
      labels: Shaped<Record<string, string>>
      ctx: Shaped<CtxSnap | null>
      ledger: Shaped<Ledger>
      plan: Shaped<PlanState>
      comp: Shaped<Record<string, CompRow>>
      // Si el HUD está abierto (session.start o /jarvis lo cambian).
      abierto: Shaped<boolean>
      // Resumen del histórico para datos.js, y el tipo de cada subagente (para el histórico, sin su descripción).
      acum: Shaped<Acumulado | null>
      tipos: Shaped<Record<string, string>>
      // Sesión a la que van los turnos del histórico y su inicio (cambia tras /clear sin session.start).
      sesionHist: Shaped<{ id: string; inicio: number } | null>
    }
  }
}
