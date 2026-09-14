export interface IGpsCoordinates {
  latitude: number
  longitude: number
  altitude?: number
}

export interface IActivityLog {
  id: string
  user_id: string
  distancia_m: number
  duracao_seg: number
  tipo_exercicio: string
  /** Nulo após o expurgo LGPD de retenção (90 dias) — ver SchedulerService.purgeSensitiveActivityData */
  coordenadas_gps: IGpsCoordinates | null
  /** Nulo após o expurgo LGPD de retenção (90 dias) — ver SchedulerService.purgeSensitiveActivityData */
  bpm_medio: number | null
  xp_gained: number
  coins_gained: number
  logged_at: Date
}
