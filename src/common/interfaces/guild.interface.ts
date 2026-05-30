import { HunterRank } from '../enums/rank.enum'

/**
 * Representa uma guilda de hunters.
 * Uma guilda possui rank próprio derivado do XP coletivo dos membros.
 */
export interface IGuild {
  id: string
  /** Nome completo da guilda (máx. 50 chars) */
  name: string
  /** Tag curta exibida entre colchetes, ex.: [BLADE] (máx. 6 chars) */
  tag: string
  description: string | null
  /** Emoji ou ícone da guilda */
  emblem: string
  /** UUID do hunter fundador/mestre atual */
  master_id: string
  /** Rank calculado com base no XP total acumulado */
  rank: HunterRank
  /** Soma das `contribution_xp` de todos os membros */
  xp: number
  /** Guilda visível para buscas públicas */
  is_public: boolean
  /** Guilda dissolvida pelo mestre ou por falta de membros */
  is_disbanded: boolean
  created_at: Date
  updated_at: Date
}
