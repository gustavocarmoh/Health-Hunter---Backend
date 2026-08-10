import { IChallengeParticipation } from '../../common/interfaces/challenge-participation.interface'

export abstract class ChallengeParticipationRepository {
  abstract create(
    data: Omit<IChallengeParticipation, 'id' | 'joined_at'>,
  ): Promise<IChallengeParticipation>

  abstract findOne(challengeId: string, userId: string): Promise<IChallengeParticipation | null>

  abstract findByUserId(userId: string): Promise<IChallengeParticipation[]>

  abstract findByChallengeId(challengeId: string): Promise<IChallengeParticipation[]>

  abstract complete(id: string): Promise<IChallengeParticipation>

  /** Marca participação como ABANDONED. */
  abstract abandon(id: string): Promise<IChallengeParticipation>
}
