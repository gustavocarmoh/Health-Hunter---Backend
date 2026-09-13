import { jest } from '@jest/globals'
import { NotFoundException } from '@nestjs/common'
import { SeasonsService } from './seasons.service.js'
import { SeasonRepository } from '../../repositories/abstract/season.repository.js'
import { ActivityRepository } from '../../repositories/abstract/activity.repository.js'
import { UserRepository } from '../../repositories/abstract/user.repository.js'

const asyncMock = () => jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>

const mockSeasonRepository = {
  findCurrent: asyncMock(),
  findById: asyncMock(),
  deactivateAll: asyncMock(),
  create: asyncMock(),
  update: asyncMock(),
}
const mockActivityRepository = { getTopByXpInPeriod: asyncMock() }
const mockUserRepository = { findByIds: asyncMock(), findById: asyncMock(), update: asyncMock() }

const season = {
  id: 'season-1',
  title: 'Season One',
  starts_at: new Date('2024-01-01'),
  ends_at: new Date('2024-02-01'),
  xp_multiplier: 1.5,
}

describe('SeasonsService', () => {
  let service: SeasonsService

  beforeEach(() => {
    service = new SeasonsService(
      mockSeasonRepository as unknown as SeasonRepository,
      mockActivityRepository as unknown as ActivityRepository,
      mockUserRepository as unknown as UserRepository,
    )
    jest.clearAllMocks()
  })

  describe('getCurrent', () => {
    it('should return active: false when there is no current season', async () => {
      mockSeasonRepository.findCurrent.mockResolvedValue(null)
      await expect(service.getCurrent()).resolves.toEqual({ active: false, season: null })
    })

    it('should return the active season', async () => {
      mockSeasonRepository.findCurrent.mockResolvedValue(season)
      await expect(service.getCurrent()).resolves.toEqual({ active: true, season })
    })
  })

  describe('getSeasonLeaderboard', () => {
    it('should throw NotFoundException when the season does not exist', async () => {
      mockSeasonRepository.findById.mockResolvedValue(null)
      await expect(service.getSeasonLeaderboard('ghost')).rejects.toThrow(NotFoundException)
    })

    it('should return an empty leaderboard when nobody scored', async () => {
      mockSeasonRepository.findById.mockResolvedValue(season)
      mockActivityRepository.getTopByXpInPeriod.mockResolvedValue([])

      const result = await service.getSeasonLeaderboard('season-1')

      expect(result.leaderboard).toEqual([])
    })

    it('should build a ranked leaderboard with hunter names', async () => {
      mockSeasonRepository.findById.mockResolvedValue(season)
      mockActivityRepository.getTopByXpInPeriod.mockResolvedValue([
        { user_id: 'u1', total_xp: 500 },
      ])
      mockUserRepository.findByIds.mockResolvedValue([{ id: 'u1', name: 'Jin', rank_level: 'C' }])

      const result = await service.getSeasonLeaderboard('season-1')

      expect(result.leaderboard[0]).toMatchObject({
        position: 1,
        hunter_id: 'u1',
        name: 'Jin',
        total_xp_this_season: 500,
      })
    })
  })

  describe('createSeason', () => {
    it('should deactivate previous seasons and create the new one', async () => {
      mockSeasonRepository.deactivateAll.mockResolvedValue(undefined)
      mockSeasonRepository.create.mockResolvedValue(season)

      const result = await service.createSeason({
        title: 'Season One',
        description: 'desc',
        starts_at: season.starts_at,
        ends_at: season.ends_at,
        xp_multiplier: 1.5,
        is_active: true,
      })

      expect(mockSeasonRepository.deactivateAll).toHaveBeenCalled()
      expect(result).toBe(season)
    })
  })

  describe('endSeason', () => {
    it('should throw NotFoundException when the season does not exist', async () => {
      mockSeasonRepository.findById.mockResolvedValue(null)
      await expect(service.endSeason('ghost')).rejects.toThrow(NotFoundException)
    })

    it('should reward the top 3 hunters and deactivate the season', async () => {
      mockSeasonRepository.findById.mockResolvedValue(season)
      mockActivityRepository.getTopByXpInPeriod.mockResolvedValue([
        { user_id: 'u1', total_xp: 900 },
      ])
      mockUserRepository.findById.mockResolvedValue({ id: 'u1', name: 'Jin', coins: 100 })
      mockUserRepository.update.mockResolvedValue(undefined)
      mockSeasonRepository.update.mockResolvedValue(undefined)

      const result = await service.endSeason('season-1')

      expect(mockUserRepository.update).toHaveBeenCalledWith('u1', { coins: 1100 })
      expect(mockSeasonRepository.update).toHaveBeenCalledWith('season-1', { is_active: false })
      expect(result.rewards_distributed).toBe(1)
    })
  })
})
