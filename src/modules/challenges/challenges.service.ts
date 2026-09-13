import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { ChallengeRepository } from '../../repositories/abstract/challenge.repository.js'
import { ChallengeParticipationRepository } from '../../repositories/abstract/challenge-participation.repository.js'
import { UserRepository } from '../../repositories/abstract/user.repository.js'
import { ActivityRepository } from '../../repositories/abstract/activity.repository.js'
import { RedisService } from '../../cache/redis.service.js'
import { RANK_ORDER } from '../../common/enums/rank.enum.js'

@Injectable()
export class ChallengesService {
  constructor(
    private readonly challengeRepository: ChallengeRepository,
    private readonly participationRepository: ChallengeParticipationRepository,
    private readonly userRepository: UserRepository,
    private readonly activityRepository: ActivityRepository,
    private readonly redisService: RedisService,
  ) {}

  async getAvailable(userId: string) {
    const user = await this.userRepository.findById(userId)
    if (!user || user.is_deleted) throw new NotFoundException('Hunter not found.')

    const rankIndex = RANK_ORDER.indexOf(user.rank_level)
    const allowedRanks = RANK_ORDER.slice(0, rankIndex + 1)

    return this.challengeRepository.findAvailableForRanks(allowedRanks)
  }

  async getMyChallenges(userId: string) {
    const participations = await this.participationRepository.findByUserId(userId)
    if (participations.length === 0) return { total: 0, participations: [] }

    const challengeIds = [...new Set(participations.map((p) => p.challenge_id))]
    const challenges = await Promise.all(
      challengeIds.map((id) => this.challengeRepository.findById(id)),
    )
    const challengeMap = new Map(challenges.filter(Boolean).map((c) => [c!.id, c!]))

    return {
      total: participations.length,
      participations: participations.map((p) => ({
        ...p,
        challenge: challengeMap.get(p.challenge_id) ?? null,
      })),
    }
  }

  async joinChallenge(challengeId: string, userId: string) {
    const [challenge, user] = await Promise.all([
      this.challengeRepository.findById(challengeId),
      this.userRepository.findById(userId),
    ])

    if (!challenge || !challenge.is_active) {
      throw new NotFoundException('Challenge not found or inactive.')
    }
    if (!user || user.is_deleted) throw new NotFoundException('Hunter not found.')

    const rankIndex = RANK_ORDER.indexOf(user.rank_level)
    const minRankIndex = RANK_ORDER.indexOf(
      challenge.min_rank_required as (typeof RANK_ORDER)[number],
    )
    if (rankIndex < minRankIndex) {
      throw new ForbiddenException(
        `This challenge requires at least Rank ${challenge.min_rank_required}.`,
      )
    }

    const existing = await this.participationRepository.findOne(challengeId, userId)
    if (existing) throw new ConflictException('Already enrolled in this challenge.')

    return this.participationRepository.create({
      challenge_id: challengeId,
      user_id: userId,
      status: 'ACTIVE',
      completed_at: null,
    })
  }

  async completeChallenge(challengeId: string, userId: string) {
    const [participation, challenge] = await Promise.all([
      this.participationRepository.findOne(challengeId, userId),
      this.challengeRepository.findById(challengeId),
    ])

    if (!participation || participation.status !== 'ACTIVE') {
      throw new NotFoundException('Active participation not found for this challenge.')
    }
    if (!challenge) throw new NotFoundException('Challenge not found.')

    // Verify qualifying activity logged after joining
    const activitiesSince = await this.activityRepository.findByUserIdSince(
      userId,
      participation.joined_at,
    )
    const qualifying = activitiesSince.find(
      (a) => a.tipo_exercicio.toLowerCase() === challenge.tipo_exercicio.toLowerCase(),
    )
    if (!qualifying) {
      throw new BadRequestException(
        `No qualifying activity of type "${challenge.tipo_exercicio}" found after joining. ` +
          `Log an activity of this type to complete the challenge.`,
      )
    }

    const completed = await this.participationRepository.complete(participation.id)

    // Award XP and coins
    const user = await this.userRepository.findById(userId)
    if (user && !user.is_deleted) {
      await this.userRepository.update(userId, {
        xp: user.xp + challenge.xp_base,
        coins: user.coins + challenge.coins_base,
      })
      await this.redisService.del(`hunter:profile:${userId}`)
      await this.redisService.invalidatePattern('leaderboard:*')
    }

    return {
      message: 'Challenge completed!',
      xp_gained: challenge.xp_base,
      coins_gained: challenge.coins_base,
      participation: completed,
    }
  }

  async abandonChallenge(challengeId: string, userId: string) {
    const participation = await this.participationRepository.findOne(challengeId, userId)
    if (!participation || participation.status !== 'ACTIVE') {
      throw new NotFoundException('Active participation not found for this challenge.')
    }
    const abandoned = await this.participationRepository.abandon(participation.id)
    return { message: 'Challenge abandoned.', participation: abandoned }
  }

  async getChallenge(challengeId: string) {
    const challenge = await this.challengeRepository.findById(challengeId)
    if (!challenge) throw new NotFoundException('Challenge not found.')
    return challenge
  }

  async deleteChallenge(challengeId: string) {
    const challenge = await this.challengeRepository.findById(challengeId)
    if (!challenge) throw new NotFoundException('Challenge not found.')

    const participations = await this.participationRepository.findByChallengeId(challengeId)
    for (const participation of participations) {
      if (participation.status === 'ACTIVE') {
        await this.participationRepository.abandon(participation.id)
      }
    }

    await this.challengeRepository.delete(challengeId)
    await this.redisService.invalidatePattern('challenges:*')

    return { message: 'Challenge deleted successfully.' }
  }
}
