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
  coordenadas_gps: IGpsCoordinates
  bpm_medio: number
  xp_gained: number
  coins_gained: number
  logged_at: Date
}
