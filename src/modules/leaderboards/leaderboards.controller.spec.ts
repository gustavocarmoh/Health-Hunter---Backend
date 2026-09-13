import { jest } from '@jest/globals'
import { LeaderboardsController } from './leaderboards.controller.js'
import { LeaderboardsService } from './leaderboards.service.js'

const mockService = {
  getGlobal: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  getRegional: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  getLocal: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  getGlobalCursor: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  getMyPosition: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  getFriendsLeaderboard: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
}

describe('LeaderboardsController', () => {
  let controller: LeaderboardsController
  const user = { id: 'user-1' } as never

  beforeEach(() => {
    controller = new LeaderboardsController(mockService as unknown as LeaderboardsService)
    jest.clearAllMocks()
  })

  it('should get the global leaderboard', async () => {
    mockService.getGlobal.mockResolvedValue([])
    await controller.getGlobal()
    expect(mockService.getGlobal).toHaveBeenCalled()
  })

  it('should get the regional leaderboard with filters', async () => {
    mockService.getRegional.mockResolvedValue([])
    await controller.getRegional('SP', 'BR')
    expect(mockService.getRegional).toHaveBeenCalledWith('SP', 'BR')
  })

  it('should get the local leaderboard with filters', async () => {
    mockService.getLocal.mockResolvedValue([])
    await controller.getLocal('São Paulo', 'SP')
    expect(mockService.getLocal).toHaveBeenCalledWith('São Paulo', 'SP')
  })

  it('should default the cursor page limit to 20', async () => {
    mockService.getGlobalCursor.mockResolvedValue({ data: [], nextCursor: null })
    await controller.getGlobalCursor(undefined, undefined)
    expect(mockService.getGlobalCursor).toHaveBeenCalledWith(20, undefined)
  })

  it('should cap the cursor page limit at 100', async () => {
    mockService.getGlobalCursor.mockResolvedValue({ data: [], nextCursor: null })
    await controller.getGlobalCursor('500', 'cursor-1')
    expect(mockService.getGlobalCursor).toHaveBeenCalledWith(100, 'cursor-1')
  })

  it('should get the current user position', async () => {
    mockService.getMyPosition.mockResolvedValue({ global: 1 })
    await controller.getMyPosition(user)
    expect(mockService.getMyPosition).toHaveBeenCalledWith('user-1')
  })

  it('should get the friends leaderboard', async () => {
    mockService.getFriendsLeaderboard.mockResolvedValue({ leaderboard: [] })
    await controller.getFriendsLeaderboard(user)
    expect(mockService.getFriendsLeaderboard).toHaveBeenCalledWith('user-1')
  })
})
