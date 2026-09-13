import { jest } from '@jest/globals'
import { Test, TestingModule } from '@nestjs/testing'
import { getDataSourceToken } from '@nestjs/typeorm'
import { RankEngineService } from './rank-engine.service.js'
import { UserRepository } from '../../repositories/abstract/user.repository.js'
import { HunterRank } from '../enums/rank.enum.js'
import { Role } from '../enums/role.enum.js'
import { LifestyleType } from '../enums/lifestyle.enum.js'
import { IUser } from '../interfaces/user.interface.js'

const asyncMock = () => jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>

const mockUser: IUser = {
  id: 'user-1',
  email: 'hunter@test.com',
  password_hash: 'hashed',
  name: 'Hunter',
  role: Role.USER,
  rank_level: HunterRank.D,
  xp: 0,
  coins: 0,
  stat_points_available: 0,
  strength: 0,
  intel: 0,
  vitality: 0,
  sense: 0,
  agility: 0,
  lifestyle: LifestyleType.CASUAL,
  region_state: 'SP',
  region_country: 'BR',
  city: 'São Paulo',
  is_deleted: false,
  anonymized_at: null,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
}

const mockUserRepository = {
  update: asyncMock(),
}

const mockDataSource = {
  query: asyncMock(),
}

const mockEventEmitter = {
  emit: jest.fn(),
}

describe('RankEngineService', () => {
  let service: RankEngineService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RankEngineService,
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: getDataSourceToken(), useValue: mockDataSource },
      ],
    }).compile()

    service = module.get<RankEngineService>(RankEngineService)
    jest.clearAllMocks()
  })

  describe('getEffectiveThreshold', () => {
    it('should return the base threshold when there are no regional competitors', async () => {
      mockDataSource.query.mockResolvedValue([{ count: '0' }])

      const result = await service.getEffectiveThreshold(mockUser, HunterRank.C)

      expect(result.base_threshold).toBe(12_000)
      expect(result.regional_competitors).toBe(0)
      expect(result.pressure_multiplier).toBe(1)
      expect(result.effective_threshold).toBe(12_000)
    })

    it('should increase the effective threshold with regional pressure', async () => {
      mockDataSource.query.mockResolvedValue([{ count: '3' }])

      const result = await service.getEffectiveThreshold(mockUser, HunterRank.C)

      expect(result.regional_competitors).toBe(3)
      expect(result.pressure_multiplier).toBeGreaterThan(1)
      expect(result.effective_threshold).toBeGreaterThan(result.base_threshold)
    })

    it('should default competitor count to 0 when the query returns no rows', async () => {
      mockDataSource.query.mockResolvedValue([])

      const result = await service.getEffectiveThreshold(mockUser, HunterRank.D)

      expect(result.regional_competitors).toBe(0)
    })
  })

  describe('checkPromotion', () => {
    it('should do nothing when the hunter is already at rank S', async () => {
      const topUser = { ...mockUser, rank_level: HunterRank.S }

      await service.checkPromotion(topUser, 999_999, mockEventEmitter as never)

      expect(mockDataSource.query).not.toHaveBeenCalled()
      expect(mockUserRepository.update).not.toHaveBeenCalled()
    })

    it('should not promote when XP is below the effective threshold', async () => {
      mockDataSource.query.mockResolvedValue([{ count: '0' }])

      await service.checkPromotion(mockUser, 100, mockEventEmitter as never)

      expect(mockUserRepository.update).not.toHaveBeenCalled()
      expect(mockEventEmitter.emit).not.toHaveBeenCalled()
    })

    it('should promote and emit hunter.rank_up when XP reaches the threshold', async () => {
      mockDataSource.query.mockResolvedValue([{ count: '0' }])
      mockUserRepository.update.mockResolvedValue(undefined)

      await service.checkPromotion(mockUser, 12_000, mockEventEmitter as never)

      expect(mockUserRepository.update).toHaveBeenCalledWith(mockUser.id, {
        rank_level: HunterRank.C,
      })
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'hunter.rank_up',
        expect.objectContaining({
          hunter_id: mockUser.id,
          old_rank: HunterRank.D,
          new_rank: HunterRank.C,
          total_xp: 12_000,
        }),
      )
    })
  })

  describe('runWeeklyDecay', () => {
    it('should decay XP of inactive hunters but respect the rank floor', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ id: 'u1', xp: 2_000, rank_level: HunterRank.D }])
        .mockResolvedValueOnce([]) // C
        .mockResolvedValueOnce([]) // B
        .mockResolvedValueOnce([]) // A
        .mockResolvedValueOnce([]) // S
      mockUserRepository.update.mockResolvedValue(undefined)

      const report = await service.runWeeklyDecay()

      expect(mockUserRepository.update).toHaveBeenCalledWith('u1', { xp: 1900 })
      expect(report.xp_decayed).toBe(1)
    })

    it('should not decay below the rank floor', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ id: 'u1', xp: 1_600, rank_level: HunterRank.D }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      const report = await service.runWeeklyDecay()

      expect(mockUserRepository.update).not.toHaveBeenCalled()
      expect(report.xp_decayed).toBe(0)
    })

    it('should demote hunters who missed the weekly minimum for two weeks in a row', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([]) // inactive decay pass
        .mockResolvedValueOnce([{ id: 'u2', xp: 2_050, week1: '10', week2: '20' }]) // D
        .mockResolvedValueOnce([]) // C
        .mockResolvedValueOnce([]) // B
        .mockResolvedValueOnce([]) // A
        .mockResolvedValueOnce([]) // S
      mockUserRepository.update.mockResolvedValue(undefined)

      const report = await service.runWeeklyDecay()

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        'u2',
        expect.objectContaining({ rank_level: HunterRank.E }),
      )
      expect(report.demoted).toBe(1)
      expect(report.demoted_ids).toContain('u2')
    })

    it('should not demote hunters who met the weekly minimum', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'u3', xp: 2_500, week1: '500', week2: '500' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      const report = await service.runWeeklyDecay()

      expect(mockUserRepository.update).not.toHaveBeenCalled()
      expect(report.demoted).toBe(0)
    })
  })
})
