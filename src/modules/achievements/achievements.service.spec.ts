import { jest } from '@jest/globals'
import { NotFoundException } from '@nestjs/common'
import { AchievementsService } from './achievements.service.js'
import { AchievementRepository } from '../../repositories/abstract/achievement.repository.js'
import { UserRepository } from '../../repositories/abstract/user.repository.js'
import { ActivityRepository } from '../../repositories/abstract/activity.repository.js'
import { Role } from '../../common/enums/role.enum.js'
import { HunterRank } from '../../common/enums/rank.enum.js'
import { LifestyleType } from '../../common/enums/lifestyle.enum.js'
import { IUser } from '../../common/interfaces/user.interface.js'

const asyncMock = () => jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>

const mockUser: IUser = {
  id: 'user-1',
  email: 'jin@hunter.com',
  password_hash: 'hashed',
  name: 'Jin',
  role: Role.USER,
  rank_level: HunterRank.C,
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
  created_at: new Date(),
  updated_at: new Date(),
}

const mockAchievementRepository = { findAll: asyncMock() }
const mockUserRepository = { findById: asyncMock() }
const mockActivityRepository = { findAllByUserId: asyncMock() }

describe('AchievementsService', () => {
  let service: AchievementsService

  beforeEach(() => {
    service = new AchievementsService(
      mockAchievementRepository as unknown as AchievementRepository,
      mockUserRepository as unknown as UserRepository,
      mockActivityRepository as unknown as ActivityRepository,
    )
    jest.clearAllMocks()
  })

  describe('getCatalog', () => {
    it('should return the full achievement catalog', async () => {
      mockAchievementRepository.findAll.mockResolvedValue([{ id: 'a1' }, { id: 'a2' }])

      const result = await service.getCatalog()

      expect(result).toEqual({ total: 2, achievements: [{ id: 'a1' }, { id: 'a2' }] })
    })
  })

  describe('getMyAchievements', () => {
    it('should throw NotFoundException when the hunter does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null)

      await expect(service.getMyAchievements('ghost')).rejects.toThrow(NotFoundException)
    })

    it('should mark ACTIVITIES_COUNT achievements as unlocked when met', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser)
      mockAchievementRepository.findAll.mockResolvedValue([
        { id: 'a1', condition_type: 'ACTIVITIES_COUNT', condition_value: 2 },
      ])
      mockActivityRepository.findAllByUserId.mockResolvedValue([
        { distancia_m: 1000 },
        { distancia_m: 2000 },
      ])

      const result = await service.getMyAchievements(mockUser.id)

      expect(result.achievements[0].is_unlocked).toBe(true)
    })

    it('should mark DISTANCE_KM achievements as locked when not met', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser)
      mockAchievementRepository.findAll.mockResolvedValue([
        { id: 'a2', condition_type: 'DISTANCE_KM', condition_value: 100 },
      ])
      mockActivityRepository.findAllByUserId.mockResolvedValue([{ distancia_m: 1000 }])

      const result = await service.getMyAchievements(mockUser.id)

      expect(result.achievements[0].is_unlocked).toBe(false)
    })

    it('should mark RANK_REACHED achievements based on rank order', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser) // rank C -> index 2
      mockAchievementRepository.findAll.mockResolvedValue([
        { id: 'a3', condition_type: 'RANK_REACHED', condition_value: 1 },
      ])
      mockActivityRepository.findAllByUserId.mockResolvedValue([])

      const result = await service.getMyAchievements(mockUser.id)

      expect(result.achievements[0].is_unlocked).toBe(true)
    })
  })
})
