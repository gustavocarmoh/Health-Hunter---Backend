export interface IChallenge {
  id: string
  title: string
  description: string
  tipo_exercicio: string
  xp_base: number
  coins_base: number
  min_rank_required: string
  is_active: boolean
  created_at: Date
}
