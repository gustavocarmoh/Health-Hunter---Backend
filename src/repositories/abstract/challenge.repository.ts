import { IChallenge } from '../../common/interfaces/challenge.interface.js'
import { HunterRank } from '../../common/enums/rank.enum.js'

export abstract class ChallengeRepository {
  abstract create(challenge: Omit<IChallenge, 'id' | 'created_at'>): Promise<IChallenge>

  abstract findAll(): Promise<IChallenge[]>

  abstract findById(id: string): Promise<IChallenge | null>

  abstract findAvailableForRanks(allowedRanks: HunterRank[]): Promise<IChallenge[]>

  abstract update(id: string, data: Partial<IChallenge>): Promise<IChallenge | null>

  abstract delete(id: string): Promise<void>
}
