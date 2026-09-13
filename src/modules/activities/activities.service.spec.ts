import { jest } from '@jest/globals'
import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { ActivitiesService } from './activities.service.js'
import { ActivityRepository } from '../../repositories/abstract/activity.repository.js'
import { UserRepository } from '../../repositories/abstract/user.repository.js'
import { RedisService } from '../../cache/redis.service.js'
import { RankEngineService } from '../../common/rank/rank-engine.service.js'
import { Role } from '../../common/enums/role.enum.js'
import { HunterRank } from '../../common/enums/rank.enum.js'
import { LifestyleType } from '../../common/enums/lifestyle.enum.js'
import { IUser } from '../../common/interfaces/user.interface.js'
import { IActivityLog } from '../../common/interfaces/activity.interface.js'

const mockUser: IUser = {
  id: 'user-xyz',
  email: 'hunter@test.com',
  password_hash: 'hashed',
  name: 'Shadow Monarch',
  role: Role.USER,
  rank_level: HunterRank.E,
  xp: 0,
  coins: 0,
  stat_points_available: 0,
  strength: 0,
  intel: 0,
  vitality: 0,
  sense: 0,
  agility: 0,
  lifestyle: LifestyleType.HARDCORE,
  region_state: 'SP',
  region_country: 'BR',
  city: 'São Paulo',
  is_deleted: false,
  anonymized_at: null,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
}

const mockActivity: IActivityLog = {
  id: 'act-001',
  user_id: 'user-xyz',
  distancia_m: 5000,
  duracao_seg: 1800,
  tipo_exercicio: 'Running',
  coordenadas_gps: { latitude: -23.55, longitude: -46.63 },
  bpm_medio: 145,
  xp_gained: 100,
  coins_gained: 50,
  logged_at: new Date('2024-06-01'),
}

const asyncMock = () => jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>

const mockActivityRepository = {
  create: asyncMock(),
  findByUserId: asyncMock(),
  findAllByUserId: asyncMock(),
  findById: asyncMock(),
  findByUserIdSince: asyncMock(),
}

const mockUserRepository = {
  findById: asyncMock(),
  update: asyncMock(),
}

const mockRedisService = {
  del: asyncMock(),
  invalidatePattern: asyncMock(),
}

const mockEventEmitter = {
  emit: jest.fn(),
}

const mockRankEngineService = {
  checkPromotion: asyncMock(),
}

describe('ActivitiesService', () => {
  let service: ActivitiesService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        { provide: ActivityRepository, useValue: mockActivityRepository },
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: RedisService, useValue: mockRedisService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: RankEngineService, useValue: mockRankEngineService },
      ],
    }).compile()

    service = module.get<ActivitiesService>(ActivitiesService)
    jest.clearAllMocks()
  })

  // ─── logActivity ─────────────────────────────────────────────────────────

  describe('logActivity', () => {
    const validDto = {
      distancia_m: 5000,
      duracao_seg: 1800, // ~10 km/h — within limit
      tipo_exercicio: 'Running',
      coordenadas_gps: { latitude: -23.55, longitude: -46.63 },
      bpm_medio: 145,
    }

    it('should persist activity, update user XP/coins, and invalidate cache', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser)
      mockActivityRepository.create.mockResolvedValue(mockActivity)
      mockUserRepository.update.mockResolvedValue(undefined)
      mockRankEngineService.checkPromotion.mockResolvedValue(undefined)
      mockRedisService.del.mockResolvedValue(undefined)
      mockRedisService.invalidatePattern.mockResolvedValue(undefined)

      const result = await service.logActivity('user-xyz', validDto)

      expect(result).toMatchObject({
        activity_id: mockActivity.id,
        xp_gained: 100, // base 100 × E multiplier 1.0
        coins_gained: 50,
        total_xp: 100,
        total_coins: 50,
      })
      expect(mockActivityRepository.create).toHaveBeenCalledTimes(1)
      expect(mockUserRepository.update).toHaveBeenCalledWith('user-xyz', {
        xp: 100,
        coins: 50,
      })
      expect(mockRedisService.del).toHaveBeenCalledWith('hunter:profile:user-xyz')
      expect(mockRedisService.invalidatePattern).toHaveBeenCalledWith('leaderboard:*')
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'activity.completed',
        expect.objectContaining({ hunter_id: 'user-xyz' }),
      )
    })

    it('should throw NotFoundException when hunter does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null)

      await expect(service.logActivity('ghost-id', validDto)).rejects.toThrow(NotFoundException)
    })

    it('should throw NotFoundException when account is deleted', async () => {
      mockUserRepository.findById.mockResolvedValue({
        ...mockUser,
        is_deleted: true,
      })

      await expect(service.logActivity('user-xyz', validDto)).rejects.toThrow(NotFoundException)
    })

    it('should throw BadRequestException when speed exceeds 50 km/h', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser)

      // 10 km in 60 s = 600 km/h
      await expect(
        service.logActivity('user-xyz', {
          ...validDto,
          distancia_m: 10000,
          duracao_seg: 60,
        }),
      ).rejects.toThrow(BadRequestException)
    })

    it('should apply rank multiplier for non-E ranks', async () => {
      const rankCUser = { ...mockUser, rank_level: HunterRank.C, xp: 5000 }
      mockUserRepository.findById.mockResolvedValue(rankCUser)
      mockActivityRepository.create.mockResolvedValue({
        ...mockActivity,
        xp_gained: 200,
        coins_gained: 100,
      })
      mockUserRepository.update.mockResolvedValue(undefined)
      mockRankEngineService.checkPromotion.mockResolvedValue(undefined)
      mockRedisService.del.mockResolvedValue(undefined)
      mockRedisService.invalidatePattern.mockResolvedValue(undefined)

      const result = await service.logActivity('user-xyz', validDto)

      // Rank C multiplier = 2.0 → xp = 200
      expect(result.xp_gained).toBe(200)
      expect(result.coins_gained).toBe(100)
    })
  })

  // ─── getHistory ───────────────────────────────────────────────────────────

  describe('getHistory', () => {
    it('should return paginated activity history', async () => {
      const paginatedResult = { total: 1, page: 1, limit: 10, data: [mockActivity] }
      mockActivityRepository.findByUserId.mockResolvedValue(paginatedResult)

      const result = await service.getHistory('user-xyz', 1, 10)

      expect(mockActivityRepository.findByUserId).toHaveBeenCalledWith('user-xyz', 1, 10)
      expect(result).toEqual(paginatedResult)
    })
  })

  // ─── getSummary ───────────────────────────────────────────────────────────

  describe('getSummary', () => {
    it('should return weekly and monthly aggregates', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser)
      mockActivityRepository.findAllByUserId.mockResolvedValue([mockActivity])

      const result = await service.getSummary('user-xyz')

      expect(result).toMatchObject({
        hunter_id: 'user-xyz',
        weekly: expect.objectContaining({ count: expect.any(Number) }),
        monthly: expect.objectContaining({ count: expect.any(Number) }),
      })
    })

    it('should throw NotFoundException when hunter does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null)

      await expect(service.getSummary('ghost-id')).rejects.toThrow(NotFoundException)
    })

    it('should return zero metrics when there are no activities', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser)
      mockActivityRepository.findAllByUserId.mockResolvedValue([])

      const result = await service.getSummary('user-xyz')

      expect(result.weekly.count).toBe(0)
      expect(result.monthly.count).toBe(0)
    })
  })

  // ─── getActivity ─────────────────────────────────────────────────────────

  describe('getActivity', () => {
    it('should return the activity when it belongs to the user', async () => {
      mockActivityRepository.findById.mockResolvedValue(mockActivity)

      const result = await service.getActivity('act-001', 'user-xyz')

      expect(result).toEqual(mockActivity)
    })

    it('should throw NotFoundException when activity does not exist', async () => {
      mockActivityRepository.findById.mockResolvedValue(null)

      await expect(service.getActivity('nonexistent', 'user-xyz')).rejects.toThrow(
        NotFoundException,
      )
    })

    it('should throw NotFoundException when activity belongs to another user', async () => {
      mockActivityRepository.findById.mockResolvedValue({
        ...mockActivity,
        user_id: 'other-user',
      })

      await expect(service.getActivity('act-001', 'user-xyz')).rejects.toThrow(NotFoundException)
    })
  })
})
