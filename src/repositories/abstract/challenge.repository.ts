import { IChallenge } from '../../common/interfaces/challenge.interface.js'
import { HunterRank } from '../../common/enums/rank.enum.js'

/**
 * Contrato abstrato do repositório de desafios gamificados (Quests e Raids).
 */
export abstract class ChallengeRepository {
  abstract create(challenge: Omit<IChallenge, 'id' | 'created_at'>): Promise<IChallenge>

  abstract findAll(): Promise<IChallenge[]>

  abstract findById(id: string): Promise<IChallenge | null>

  /** Retorna desafios ativos cujo min_rank_required está contido em `allowedRanks`. */
  abstract findAvailableForRanks(allowedRanks: HunterRank[]): Promise<IChallenge[]>

  /** Atualiza campos de um desafio. */
  abstract update(id: string, data: Partial<IChallenge>): Promise<IChallenge | null>

  /** Deleta um desafio. */
  abstract delete(id: string): Promise<void>
}
