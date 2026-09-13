import { jest } from '@jest/globals'
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common'
import { HuntersService } from './hunters.service.js'
import { UserRepository } from '../../repositories/abstract/user.repository.js'
import { ActivityRepository } from '../../repositories/abstract/activity.repository.js'
import { FollowRepository } from '../../repositories/abstract/follow.repository.js'
import { BodyMeasurementRepository } from '../../repositories/abstract/body-measurement.repository.js'
import { RedisService } from '../../cache/redis.service.js'

const asyncMock = () => jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>

const mockUserRepository = {
  findById: asyncMock(),
  update: asyncMock(),
  findByIds: asyncMock(),
  findSuggested: asyncMock(),
  findByNameContains: asyncMock(),
}
const mockActivityRepository = { findAllByUserId: asyncMock(), findByUserIds: asyncMock() }
const mockFollowRepository = {
  follow: asyncMock(),
  unfollow: asyncMock(),
  findFollowerIds: asyncMock(),
  countFollowers: asyncMock(),
  countFollowing: asyncMock(),
  findFollowingIds: asyncMock(),
}
const mockBodyMeasurementRepository = { create: asyncMock(), findByUserId: asyncMock() }
const mockRedisService = { get: asyncMock(), set: asyncMock(), del: asyncMock() }

const user = {
  id: 'user-1',
  is_deleted: false,
  password_hash: 'hashed',
  name: 'Jin',
  rank_level: 'C',
  xp: 1000,
  coins: 200,
  city: 'São Paulo',
  region_state: 'SP',
  stat_points_available: 2,
  strength: 1,
  intel: 1,
  vitality: 1,
  sense: 1,
  agility: 1,
}

describe('HuntersService', () => {
  let service: HuntersService

  beforeEach(() => {
    service = new HuntersService(
      mockUserRepository as unknown as UserRepository,
      mockActivityRepository as unknown as ActivityRepository,
      mockFollowRepository as unknown as FollowRepository,
      mockBodyMeasurementRepository as unknown as BodyMeasurementRepository,
      mockRedisService as unknown as RedisService,
    )
    jest.clearAllMocks()
  })

  describe('getProfile', () => {
    it('should return the cached profile on a cache hit', async () => {
      mockRedisService.get.mockResolvedValue({ id: 'user-1' })
      await expect(service.getProfile('user-1')).resolves.toEqual({ id: 'user-1' })
      expect(mockUserRepository.findById).not.toHaveBeenCalled()
    })

    it('should throw NotFoundException when the hunter does not exist', async () => {
      mockRedisService.get.mockResolvedValue(null)
      mockUserRepository.findById.mockResolvedValue(null)
      await expect(service.getProfile('ghost')).rejects.toThrow(NotFoundException)
    })

    it('should populate the cache and strip password_hash on a miss', async () => {
      mockRedisService.get.mockResolvedValue(null)
      mockUserRepository.findById.mockResolvedValue(user)
      mockRedisService.set.mockResolvedValue(undefined)

      const result = await service.getProfile('user-1')

      expect(result).not.toHaveProperty('password_hash')
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'hunter:profile:user-1',
        expect.not.objectContaining({ password_hash: expect.anything() }),
        30,
      )
    })
  })

  describe('updateProfile', () => {
    it('should throw NotFoundException when the hunter does not exist', async () => {
      mockUserRepository.update.mockResolvedValue(null)
      await expect(service.updateProfile('ghost', {})).rejects.toThrow(NotFoundException)
    })

    it('should update, invalidate cache and strip password_hash', async () => {
      mockUserRepository.update.mockResolvedValue(user)
      mockRedisService.del.mockResolvedValue(undefined)

      const result = await service.updateProfile('user-1', { name: 'New' } as never)

      expect(mockRedisService.del).toHaveBeenCalledWith('hunter:profile:user-1')
      expect(result).not.toHaveProperty('password_hash')
    })
  })

  describe('deleteAccount', () => {
    it('should throw NotFoundException when the hunter does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null)
      await expect(service.deleteAccount('ghost')).rejects.toThrow(NotFoundException)
    })

    it('should anonymize PII and invalidate the cache', async () => {
      mockUserRepository.findById.mockResolvedValue(user)
      mockUserRepository.update.mockResolvedValue(undefined)
      mockRedisService.del.mockResolvedValue(undefined)

      const result = await service.deleteAccount('user-1')

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ is_deleted: true, name: 'DELETED_USER' }),
      )
      expect(result.message).toContain('anonymized')
    })
  })

  describe('getStats', () => {
    it('should throw NotFoundException when the hunter does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null)
      await expect(service.getStats('ghost')).rejects.toThrow(NotFoundException)
    })

    it('should aggregate activity stats', async () => {
      mockUserRepository.findById.mockResolvedValue(user)
      mockActivityRepository.findAllByUserId.mockResolvedValue([
        {
          distancia_m: 1000,
          duracao_seg: 600,
          xp_gained: 50,
          coins_gained: 25,
          bpm_medio: 140,
          tipo_exercicio: 'Running',
        },
        {
          distancia_m: 2000,
          duracao_seg: 1200,
          xp_gained: 100,
          coins_gained: 50,
          bpm_medio: 150,
          tipo_exercicio: 'Running',
        },
      ])

      const result = await service.getStats('user-1')

      expect(result.total_activities).toBe(2)
      expect(result.total_distance_km).toBeCloseTo(3)
      expect(result.exercise_breakdown).toEqual({ Running: 2 })
    })

    it('should return 0 avg_bpm when there are no activities', async () => {
      mockUserRepository.findById.mockResolvedValue(user)
      mockActivityRepository.findAllByUserId.mockResolvedValue([])

      const result = await service.getStats('user-1')

      expect(result.avg_bpm).toBe(0)
    })
  })

  describe('getXpHistory', () => {
    it('should paginate the activity history', async () => {
      mockActivityRepository.findAllByUserId.mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => ({
          id: `a${i}`,
          tipo_exercicio: 'Run',
          xp_gained: 10,
          coins_gained: 5,
          logged_at: new Date(),
        })),
      )

      const result = await service.getXpHistory('user-1', 1, 2)

      expect(result.total).toBe(5)
      expect(result.activities).toHaveLength(2)
    })
  })

  describe('getPublicProfile', () => {
    it('should throw NotFoundException when missing', async () => {
      mockUserRepository.findById.mockResolvedValue(null)
      await expect(service.getPublicProfile('ghost')).rejects.toThrow(NotFoundException)
    })

    it('should return the public fields only', async () => {
      mockUserRepository.findById.mockResolvedValue(user)
      const result = await service.getPublicProfile('user-1')
      expect(result).not.toHaveProperty('password_hash')
      expect(result).toMatchObject({ id: 'user-1', name: 'Jin' })
    })
  })

  describe('follow', () => {
    it('should throw BadRequestException when following self', async () => {
      await expect(service.follow('user-1', 'user-1')).rejects.toThrow(BadRequestException)
    })

    it('should throw NotFoundException when the target does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null)
      await expect(service.follow('user-1', 'user-2')).rejects.toThrow(NotFoundException)
    })

    it('should follow the target hunter', async () => {
      mockUserRepository.findById.mockResolvedValue(user)
      mockFollowRepository.follow.mockResolvedValue({ id: 'f1' })

      const result = await service.follow('user-1', 'user-2')

      expect(result.message).toBe('Now following.')
    })
  })

  describe('unfollow', () => {
    it('should unfollow the target hunter', async () => {
      mockFollowRepository.unfollow.mockResolvedValue(undefined)
      const result = await service.unfollow('user-1', 'user-2')
      expect(result.message).toBe('Unfollowed successfully.')
    })
  })

  describe('getFollowers', () => {
    it('should throw NotFoundException when missing', async () => {
      mockUserRepository.findById.mockResolvedValue(null)
      await expect(service.getFollowers('ghost')).rejects.toThrow(NotFoundException)
    })

    it('should return follower details', async () => {
      mockUserRepository.findById.mockResolvedValue(user)
      mockFollowRepository.findFollowerIds.mockResolvedValue(['u2'])
      mockFollowRepository.countFollowers.mockResolvedValue(1)
      mockFollowRepository.countFollowing.mockResolvedValue(0)
      mockUserRepository.findByIds.mockResolvedValue([
        { id: 'u2', name: 'B', rank_level: 'D', xp: 5 },
      ])

      const result = await service.getFollowers('user-1')

      expect(result.followers_count).toBe(1)
      expect(result.followers).toHaveLength(1)
    })

    it('should skip the findByIds call when there are no followers', async () => {
      mockUserRepository.findById.mockResolvedValue(user)
      mockFollowRepository.findFollowerIds.mockResolvedValue([])
      mockFollowRepository.countFollowers.mockResolvedValue(0)
      mockFollowRepository.countFollowing.mockResolvedValue(0)

      const result = await service.getFollowers('user-1')

      expect(mockUserRepository.findByIds).not.toHaveBeenCalled()
      expect(result.followers).toEqual([])
    })
  })

  describe('getFollowing', () => {
    it('should throw NotFoundException when missing', async () => {
      mockUserRepository.findById.mockResolvedValue(null)
      await expect(service.getFollowing('ghost')).rejects.toThrow(NotFoundException)
    })

    it('should return the following list', async () => {
      mockUserRepository.findById.mockResolvedValue(user)
      mockFollowRepository.findFollowingIds.mockResolvedValue(['u2'])
      mockUserRepository.findByIds.mockResolvedValue([
        { id: 'u2', name: 'B', rank_level: 'D', xp: 5 },
      ])

      const result = await service.getFollowing('user-1')

      expect(result.following_count).toBe(1)
    })
  })

  describe('getFeed', () => {
    it('should return an empty feed when following nobody', async () => {
      mockFollowRepository.findFollowingIds.mockResolvedValue([])
      await expect(service.getFeed('user-1', 30)).resolves.toEqual({ total: 0, activities: [] })
    })

    it('should enrich feed activities with hunter names', async () => {
      mockFollowRepository.findFollowingIds.mockResolvedValue(['u2'])
      mockActivityRepository.findByUserIds.mockResolvedValue([
        {
          id: 'a1',
          user_id: 'u2',
          tipo_exercicio: 'Run',
          distancia_m: 1000,
          xp_gained: 10,
          logged_at: new Date(),
        },
      ])
      mockUserRepository.findByIds.mockResolvedValue([{ id: 'u2', name: 'B' }])

      const result = await service.getFeed('user-1', 30)

      expect(result.activities[0].hunter_name).toBe('B')
    })
  })

  describe('getSuggested', () => {
    it('should throw NotFoundException when the hunter does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null)
      await expect(service.getSuggested('ghost', 10)).rejects.toThrow(NotFoundException)
    })

    it('should return suggested hunters excluding self and followed', async () => {
      mockUserRepository.findById.mockResolvedValue(user)
      mockFollowRepository.findFollowingIds.mockResolvedValue(['u2'])
      mockUserRepository.findSuggested.mockResolvedValue([
        { id: 'u3', name: 'C', rank_level: 'C', xp: 1, city: 'SP', region_state: 'SP' },
      ])

      const result = await service.getSuggested('user-1', 10)

      expect(result.total).toBe(1)
    })
  })

  describe('logMeasurement', () => {
    it('should throw NotFoundException when the hunter does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null)
      await expect(service.logMeasurement('ghost', { weight_kg: 70 })).rejects.toThrow(
        NotFoundException,
      )
    })

    it('should throw BadRequestException when no measurement field is given', async () => {
      mockUserRepository.findById.mockResolvedValue(user)
      await expect(service.logMeasurement('user-1', {})).rejects.toThrow(BadRequestException)
    })

    it('should create a measurement entry', async () => {
      mockUserRepository.findById.mockResolvedValue(user)
      mockBodyMeasurementRepository.create.mockResolvedValue({ id: 'm1', weight_kg: 70 })

      const result = await service.logMeasurement('user-1', { weight_kg: 70 })

      expect(result).toEqual({ id: 'm1', weight_kg: 70 })
    })
  })

  describe('getMeasurements', () => {
    it('should throw NotFoundException when missing', async () => {
      mockUserRepository.findById.mockResolvedValue(null)
      await expect(service.getMeasurements('ghost', 1, 20)).rejects.toThrow(NotFoundException)
    })

    it('should return the paginated measurement history', async () => {
      mockUserRepository.findById.mockResolvedValue(user)
      mockBodyMeasurementRepository.findByUserId.mockResolvedValue({ total: 0, data: [] })

      await service.getMeasurements('user-1', 1, 20)

      expect(mockBodyMeasurementRepository.findByUserId).toHaveBeenCalledWith('user-1', 1, 20)
    })
  })

  describe('getFriends', () => {
    it('should throw NotFoundException when missing', async () => {
      mockUserRepository.findById.mockResolvedValue(null)
      await expect(service.getFriends('ghost', 1, 50)).rejects.toThrow(NotFoundException)
    })

    it('should return an empty friend list when following nobody', async () => {
      mockUserRepository.findById.mockResolvedValue(user)
      mockFollowRepository.findFollowingIds.mockResolvedValue([])

      const result = await service.getFriends('user-1', 1, 50)

      expect(result.friends).toEqual([])
    })

    it('should return the friend list', async () => {
      mockUserRepository.findById.mockResolvedValue(user)
      mockFollowRepository.findFollowingIds.mockResolvedValue(['u2'])
      mockUserRepository.findByIds.mockResolvedValue([
        { id: 'u2', name: 'B', rank_level: 'D', xp: 5 },
      ])

      const result = await service.getFriends('user-1', 1, 50)

      expect(result.friends).toHaveLength(1)
    })
  })

  describe('searchHunters', () => {
    it('should throw BadRequestException for a too-short query', async () => {
      await expect(service.searchHunters('user-1', 'a', 20)).rejects.toThrow(BadRequestException)
    })

    it('should throw NotFoundException when the searching hunter does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null)
      await expect(service.searchHunters('ghost', 'jin', 20)).rejects.toThrow(NotFoundException)
    })

    it('should exclude self from results and mark following state', async () => {
      mockUserRepository.findById.mockResolvedValue(user)
      mockUserRepository.findByNameContains.mockResolvedValue([
        { id: 'user-1', name: 'Jin', rank_level: 'C', xp: 1 },
        { id: 'u2', name: 'Jinho', rank_level: 'D', xp: 1 },
      ])
      mockFollowRepository.findFollowingIds.mockResolvedValue(['u2'])

      const result = await service.searchHunters('user-1', 'jin', 20)

      expect(result.results).toHaveLength(1)
      expect(result.results[0]).toMatchObject({ id: 'u2', is_following: true })
    })
  })

  describe('allocateStat', () => {
    it('should throw NotFoundException when the hunter does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null)
      await expect(service.allocateStat('ghost', 'strength')).rejects.toThrow(NotFoundException)
    })

    it('should throw ConflictException when there are no stat points available', async () => {
      mockUserRepository.findById.mockResolvedValue({ ...user, stat_points_available: 0 })
      await expect(service.allocateStat('user-1', 'strength')).rejects.toThrow(ConflictException)
    })

    it('should throw BadRequestException for an invalid attribute', async () => {
      mockUserRepository.findById.mockResolvedValue(user)
      await expect(service.allocateStat('user-1', 'luck')).rejects.toThrow(BadRequestException)
    })

    it('should increase the chosen attribute and decrement points available', async () => {
      mockUserRepository.findById.mockResolvedValue(user)
      mockUserRepository.update.mockResolvedValue({
        ...user,
        strength: 2,
        stat_points_available: 1,
      })
      mockRedisService.del.mockResolvedValue(undefined)

      const result = await service.allocateStat('user-1', 'strength')

      expect(mockUserRepository.update).toHaveBeenCalledWith('user-1', {
        stat_points_available: 1,
        strength: 2,
      })
      expect(result.stats.strength).toBe(2)
    })
  })
})
