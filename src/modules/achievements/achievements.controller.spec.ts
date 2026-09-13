import { jest } from '@jest/globals'
import { AchievementsController } from './achievements.controller.js'
import { AchievementsService } from './achievements.service.js'

const mockService = {
  getCatalog: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  getMyAchievements: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
}

describe('AchievementsController', () => {
  let controller: AchievementsController

  beforeEach(() => {
    controller = new AchievementsController(mockService as unknown as AchievementsService)
    jest.clearAllMocks()
  })

  it('should delegate getCatalog to the service', async () => {
    mockService.getCatalog.mockResolvedValue({ total: 0, achievements: [] })

    const result = await controller.getCatalog()

    expect(mockService.getCatalog).toHaveBeenCalled()
    expect(result).toEqual({ total: 0, achievements: [] })
  })

  it('should delegate getMyAchievements to the service with the current user id', async () => {
    mockService.getMyAchievements.mockResolvedValue({ total: 1 })

    const result = await controller.getMyAchievements({ id: 'user-1' } as never)

    expect(mockService.getMyAchievements).toHaveBeenCalledWith('user-1')
    expect(result).toEqual({ total: 1 })
  })
})
