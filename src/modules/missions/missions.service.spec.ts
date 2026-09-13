import { jest } from '@jest/globals'
import { NotFoundException, ConflictException } from '@nestjs/common'
import { MissionsService } from './missions.service.js'
import { UserRepository } from '../../repositories/abstract/user.repository.js'
import { DailyMissionRepository } from '../../repositories/abstract/daily-mission.repository.js'

const asyncMock = () => jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>

const mockUserRepository = { findById: asyncMock(), update: asyncMock() }
const mockDailyMissionRepository = {
  findByUserId: asyncMock(),
  findByUserIdAndDate: asyncMock(),
  create: asyncMock(),
  findById: asyncMock(),
  save: asyncMock(),
}

const user = { id: 'user-1', is_deleted: false, xp: 500 }

describe('MissionsService', () => {
  let service: MissionsService

  beforeEach(() => {
    service = new MissionsService(
      mockUserRepository as unknown as UserRepository,
      mockDailyMissionRepository as unknown as DailyMissionRepository,
    )
    jest.clearAllMocks()
  })

  describe('getMissionsForUser', () => {
    it('should throw NotFoundException when the hunter does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null)
      await expect(service.getMissionsForUser('ghost')).rejects.toThrow(NotFoundException)
    })

    it('should return the missions for the hunter', async () => {
      mockUserRepository.findById.mockResolvedValue(user)
      mockDailyMissionRepository.findByUserId.mockResolvedValue([{ id: 'm1' }])

      await expect(service.getMissionsForUser('user-1')).resolves.toEqual([{ id: 'm1' }])
    })
  })

  describe('generateDaily', () => {
    it('should throw ConflictException when missions were already generated today', async () => {
      mockUserRepository.findById.mockResolvedValue(user)
      mockDailyMissionRepository.findByUserIdAndDate.mockResolvedValue([{ id: 'm1' }])

      await expect(service.generateDaily('user-1')).rejects.toThrow(ConflictException)
    })

    it('should generate between 3 and 5 daily missions', async () => {
      mockUserRepository.findById.mockResolvedValue(user)
      mockDailyMissionRepository.findByUserIdAndDate.mockResolvedValue([])
      mockDailyMissionRepository.create.mockImplementation(async (data: unknown) => ({
        id: 'm-new',
        ...(data as object),
      }))

      const result = await service.generateDaily('user-1')

      expect(result.length).toBeGreaterThanOrEqual(3)
      expect(result.length).toBeLessThanOrEqual(5)
      expect(result[0].daily).toBe(true)
    })
  })

  describe('createIndividual', () => {
    it('should throw NotFoundException when the hunter does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null)
      await expect(
        service.createIndividual('ghost', { name: 'x', category: 'y', difficulty: 'z', xp: 10 }),
      ).rejects.toThrow(NotFoundException)
    })

    it('should create an individual mission with a default icon', async () => {
      mockUserRepository.findById.mockResolvedValue(user)
      mockDailyMissionRepository.create.mockResolvedValue({
        id: 'm1',
        name: 'Custom',
        category: 'y',
        difficulty: 'z',
        xp: 10,
        icon: '📋',
        done: false,
        daily: false,
      })

      const result = await service.createIndividual('user-1', {
        name: 'Custom',
        category: 'y',
        difficulty: 'z',
        xp: 10,
      })

      expect(result.icon).toBe('📋')
      expect(result.daily).toBe(false)
    })
  })

  describe('updateMissionDone', () => {
    it('should throw NotFoundException when the hunter does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null)
      await expect(service.updateMissionDone('ghost', 'm1', true)).rejects.toThrow(
        NotFoundException,
      )
    })

    it('should throw NotFoundException when the mission does not belong to the hunter', async () => {
      mockUserRepository.findById.mockResolvedValue(user)
      mockDailyMissionRepository.findById.mockResolvedValue({ id: 'm1', user_id: 'other' })

      await expect(service.updateMissionDone('user-1', 'm1', true)).rejects.toThrow(
        NotFoundException,
      )
    })

    it('should grant XP when marking an undone mission as done', async () => {
      mockUserRepository.findById.mockResolvedValue(user)
      mockDailyMissionRepository.findById.mockResolvedValue({
        id: 'm1',
        user_id: 'user-1',
        done: false,
        xp: 100,
        name: 'x',
        category: 'y',
        difficulty: 'z',
        icon: '🏃',
        daily: true,
      })
      mockDailyMissionRepository.save.mockImplementation(async (m: unknown) => m)
      mockUserRepository.update.mockResolvedValue(undefined)

      await service.updateMissionDone('user-1', 'm1', true)

      expect(mockUserRepository.update).toHaveBeenCalledWith('user-1', { xp: 600 })
    })

    it('should revoke XP when marking a done mission as undone', async () => {
      mockUserRepository.findById.mockResolvedValue(user)
      mockDailyMissionRepository.findById.mockResolvedValue({
        id: 'm1',
        user_id: 'user-1',
        done: true,
        xp: 100,
        name: 'x',
        category: 'y',
        difficulty: 'z',
        icon: '🏃',
        daily: true,
      })
      mockDailyMissionRepository.save.mockImplementation(async (m: unknown) => m)
      mockUserRepository.update.mockResolvedValue(undefined)

      await service.updateMissionDone('user-1', 'm1', false)

      expect(mockUserRepository.update).toHaveBeenCalledWith('user-1', { xp: 400 })
    })

    it('should not touch XP when the status does not change', async () => {
      mockUserRepository.findById.mockResolvedValue(user)
      mockDailyMissionRepository.findById.mockResolvedValue({
        id: 'm1',
        user_id: 'user-1',
        done: true,
        xp: 100,
        name: 'x',
        category: 'y',
        difficulty: 'z',
        icon: '🏃',
        daily: true,
      })
      mockDailyMissionRepository.save.mockImplementation(async (m: unknown) => m)

      await service.updateMissionDone('user-1', 'm1', true)

      expect(mockUserRepository.update).not.toHaveBeenCalled()
    })
  })
})
