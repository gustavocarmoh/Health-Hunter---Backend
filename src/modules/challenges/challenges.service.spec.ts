import { jest } from '@jest/globals'
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { ChallengesService } from './challenges.service.js'
import { ChallengeRepository } from '../../repositories/abstract/challenge.repository.js'
import { ChallengeParticipationRepository } from '../../repositories/abstract/challenge-participation.repository.js'
import { UserRepository } from '../../repositories/abstract/user.repository.js'
import { ActivityRepository } from '../../repositories/abstract/activity.repository.js'
import { RedisService } from '../../cache/redis.service.js'

const asyncMock = () => jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>

const mockChallengeRepository = {
  findAvailableForRanks: asyncMock(),
  findById: asyncMock(),
  delete: asyncMock(),
}
const mockParticipationRepository = {
  findByUserId: asyncMock(),
  findOne: asyncMock(),
  create: asyncMock(),
  complete: asyncMock(),
  abandon: asyncMock(),
  findByChallengeId: asyncMock(),
}
const mockUserRepository = { findById: asyncMock(), update: asyncMock() }
const mockActivityRepository = { findByUserIdSince: asyncMock() }
const mockRedisService = { del: asyncMock(), invalidatePattern: asyncMock() }

const user = { id: 'user-1', is_deleted: false, rank_level: 'C', xp: 100, coins: 50 }
const challenge = {
  id: 'ch-1',
  is_active: true,
  min_rank_required: 'D',
  tipo_exercicio: 'Running',
  xp_base: 100,
  coins_base: 50,
}

describe('ChallengesService', () => {
  let service: ChallengesService

  beforeEach(() => {
    service = new ChallengesService(
      mockChallengeRepository as unknown as ChallengeRepository,
      mockParticipationRepository as unknown as ChallengeParticipationRepository,
      mockUserRepository as unknown as UserRepository,
      mockActivityRepository as unknown as ActivityRepository,
      mockRedisService as unknown as RedisService,
    )
    jest.clearAllMocks()
  })

  describe('getAvailable', () => {
    it('should throw NotFoundException when the hunter does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null)
      await expect(service.getAvailable('ghost')).rejects.toThrow(NotFoundException)
    })

    it('should return challenges available for the hunter rank', async () => {
      mockUserRepository.findById.mockResolvedValue(user)
      mockChallengeRepository.findAvailableForRanks.mockResolvedValue([challenge])

      const result = await service.getAvailable('user-1')

      expect(result).toEqual([challenge])
    })
  })

  describe('getMyChallenges', () => {
    it('should return an empty result when there are no participations', async () => {
      mockParticipationRepository.findByUserId.mockResolvedValue([])
      await expect(service.getMyChallenges('user-1')).resolves.toEqual({
        total: 0,
        participations: [],
      })
    })

    it('should enrich participations with their challenge data', async () => {
      mockParticipationRepository.findByUserId.mockResolvedValue([
        { challenge_id: 'ch-1', status: 'ACTIVE' },
      ])
      mockChallengeRepository.findById.mockResolvedValue(challenge)

      const result = await service.getMyChallenges('user-1')

      expect(result.total).toBe(1)
      expect(result.participations[0].challenge).toEqual(challenge)
    })
  })

  describe('joinChallenge', () => {
    it('should throw NotFoundException when the challenge is missing or inactive', async () => {
      mockChallengeRepository.findById.mockResolvedValue(null)
      mockUserRepository.findById.mockResolvedValue(user)
      await expect(service.joinChallenge('ch-1', 'user-1')).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException when rank is insufficient', async () => {
      mockChallengeRepository.findById.mockResolvedValue({ ...challenge, min_rank_required: 'S' })
      mockUserRepository.findById.mockResolvedValue(user)
      await expect(service.joinChallenge('ch-1', 'user-1')).rejects.toThrow(ForbiddenException)
    })

    it('should throw ConflictException when already enrolled', async () => {
      mockChallengeRepository.findById.mockResolvedValue(challenge)
      mockUserRepository.findById.mockResolvedValue(user)
      mockParticipationRepository.findOne.mockResolvedValue({ id: 'p1' })
      await expect(service.joinChallenge('ch-1', 'user-1')).rejects.toThrow(ConflictException)
    })

    it('should create the participation when eligible', async () => {
      mockChallengeRepository.findById.mockResolvedValue(challenge)
      mockUserRepository.findById.mockResolvedValue(user)
      mockParticipationRepository.findOne.mockResolvedValue(null)
      mockParticipationRepository.create.mockResolvedValue({ id: 'p1', status: 'ACTIVE' })

      const result = await service.joinChallenge('ch-1', 'user-1')

      expect(result).toEqual({ id: 'p1', status: 'ACTIVE' })
    })
  })

  describe('completeChallenge', () => {
    const participation = { id: 'p1', status: 'ACTIVE', joined_at: new Date('2024-01-01') }

    it('should throw NotFoundException when there is no active participation', async () => {
      mockParticipationRepository.findOne.mockResolvedValue(null)
      mockChallengeRepository.findById.mockResolvedValue(challenge)
      await expect(service.completeChallenge('ch-1', 'user-1')).rejects.toThrow(NotFoundException)
    })

    it('should throw BadRequestException when there is no qualifying activity', async () => {
      mockParticipationRepository.findOne.mockResolvedValue(participation)
      mockChallengeRepository.findById.mockResolvedValue(challenge)
      mockActivityRepository.findByUserIdSince.mockResolvedValue([{ tipo_exercicio: 'Swimming' }])

      await expect(service.completeChallenge('ch-1', 'user-1')).rejects.toThrow(BadRequestException)
    })

    it('should award XP and coins on completion', async () => {
      mockParticipationRepository.findOne.mockResolvedValue(participation)
      mockChallengeRepository.findById.mockResolvedValue(challenge)
      mockActivityRepository.findByUserIdSince.mockResolvedValue([{ tipo_exercicio: 'running' }])
      mockParticipationRepository.complete.mockResolvedValue({
        ...participation,
        status: 'COMPLETED',
      })
      mockUserRepository.findById.mockResolvedValue(user)
      mockUserRepository.update.mockResolvedValue(undefined)
      mockRedisService.del.mockResolvedValue(undefined)
      mockRedisService.invalidatePattern.mockResolvedValue(undefined)

      const result = await service.completeChallenge('ch-1', 'user-1')

      expect(mockUserRepository.update).toHaveBeenCalledWith('user-1', { xp: 200, coins: 100 })
      expect(result).toMatchObject({ xp_gained: 100, coins_gained: 50 })
    })
  })

  describe('abandonChallenge', () => {
    it('should throw NotFoundException without an active participation', async () => {
      mockParticipationRepository.findOne.mockResolvedValue(null)
      await expect(service.abandonChallenge('ch-1', 'user-1')).rejects.toThrow(NotFoundException)
    })

    it('should abandon the participation', async () => {
      mockParticipationRepository.findOne.mockResolvedValue({ id: 'p1', status: 'ACTIVE' })
      mockParticipationRepository.abandon.mockResolvedValue({ id: 'p1', status: 'ABANDONED' })

      const result = await service.abandonChallenge('ch-1', 'user-1')

      expect(result.message).toBe('Challenge abandoned.')
    })
  })

  describe('getChallenge', () => {
    it('should throw NotFoundException when missing', async () => {
      mockChallengeRepository.findById.mockResolvedValue(null)
      await expect(service.getChallenge('ghost')).rejects.toThrow(NotFoundException)
    })

    it('should return the challenge', async () => {
      mockChallengeRepository.findById.mockResolvedValue(challenge)
      await expect(service.getChallenge('ch-1')).resolves.toBe(challenge)
    })
  })

  describe('deleteChallenge', () => {
    it('should throw NotFoundException when missing', async () => {
      mockChallengeRepository.findById.mockResolvedValue(null)
      await expect(service.deleteChallenge('ghost')).rejects.toThrow(NotFoundException)
    })

    it('should abandon active participations and delete the challenge', async () => {
      mockChallengeRepository.findById.mockResolvedValue(challenge)
      mockParticipationRepository.findByChallengeId.mockResolvedValue([
        { id: 'p1', status: 'ACTIVE' },
        { id: 'p2', status: 'COMPLETED' },
      ])
      mockParticipationRepository.abandon.mockResolvedValue(undefined)
      mockChallengeRepository.delete.mockResolvedValue(undefined)
      mockRedisService.invalidatePattern.mockResolvedValue(undefined)

      const result = await service.deleteChallenge('ch-1')

      expect(mockParticipationRepository.abandon).toHaveBeenCalledTimes(1)
      expect(mockParticipationRepository.abandon).toHaveBeenCalledWith('p1')
      expect(result.message).toBe('Challenge deleted successfully.')
    })
  })
})
