import { jest } from '@jest/globals'
import { SeasonsController } from './seasons.controller.js'
import { SeasonsService } from './seasons.service.js'

const mockService = {
  getCurrent: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  getSeasonLeaderboard: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  createSeason: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  endSeason: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
}

describe('SeasonsController', () => {
  let controller: SeasonsController

  beforeEach(() => {
    controller = new SeasonsController(mockService as unknown as SeasonsService)
    jest.clearAllMocks()
  })

  it('should get the current season', async () => {
    mockService.getCurrent.mockResolvedValue({ active: false, season: null })
    await controller.getCurrent()
    expect(mockService.getCurrent).toHaveBeenCalled()
  })

  it('should get the season leaderboard', async () => {
    mockService.getSeasonLeaderboard.mockResolvedValue({ leaderboard: [] })
    await controller.getLeaderboard('season-1')
    expect(mockService.getSeasonLeaderboard).toHaveBeenCalledWith('season-1')
  })

  it('should create a season converting the date strings', async () => {
    mockService.createSeason.mockResolvedValue({ id: 'season-1' })

    await controller.createSeason({
      title: 'Season One',
      description: 'desc',
      starts_at: '2024-01-01T00:00:00.000Z',
      ends_at: '2024-02-01T00:00:00.000Z',
      xp_multiplier: 1.5,
    } as never)

    expect(mockService.createSeason).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Season One', is_active: true }),
    )
  })

  it('should end a season', async () => {
    mockService.endSeason.mockResolvedValue({ message: 'ok' })
    await controller.endSeason('season-1')
    expect(mockService.endSeason).toHaveBeenCalledWith('season-1')
  })
})
