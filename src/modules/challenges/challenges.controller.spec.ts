import { jest } from '@jest/globals'
import { ChallengesController } from './challenges.controller.js'
import { ChallengesService } from './challenges.service.js'

const mockService = {
  getAvailable: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  getMyChallenges: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  joinChallenge: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  completeChallenge: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  abandonChallenge: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  getChallenge: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  deleteChallenge: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
}

describe('ChallengesController', () => {
  let controller: ChallengesController
  const user = { id: 'user-1' } as never

  beforeEach(() => {
    controller = new ChallengesController(mockService as unknown as ChallengesService)
    jest.clearAllMocks()
  })

  it('should get available challenges', async () => {
    mockService.getAvailable.mockResolvedValue([])
    await controller.getAvailable(user)
    expect(mockService.getAvailable).toHaveBeenCalledWith('user-1')
  })

  it('should get my challenges', async () => {
    mockService.getMyChallenges.mockResolvedValue({ total: 0 })
    await controller.getMyChallenges(user)
    expect(mockService.getMyChallenges).toHaveBeenCalledWith('user-1')
  })

  it('should join a challenge', async () => {
    mockService.joinChallenge.mockResolvedValue({ id: 'p1' })
    await controller.joinChallenge('ch-1', user)
    expect(mockService.joinChallenge).toHaveBeenCalledWith('ch-1', 'user-1')
  })

  it('should complete a challenge', async () => {
    mockService.completeChallenge.mockResolvedValue({ message: 'ok' })
    await controller.completeChallenge('ch-1', user)
    expect(mockService.completeChallenge).toHaveBeenCalledWith('ch-1', 'user-1')
  })

  it('should abandon a challenge', async () => {
    mockService.abandonChallenge.mockResolvedValue({ message: 'ok' })
    await controller.abandonChallenge('ch-1', user)
    expect(mockService.abandonChallenge).toHaveBeenCalledWith('ch-1', 'user-1')
  })

  it('should get challenge details', async () => {
    mockService.getChallenge.mockResolvedValue({ id: 'ch-1' })
    await controller.getChallenge('ch-1')
    expect(mockService.getChallenge).toHaveBeenCalledWith('ch-1')
  })

  it('should delete a challenge', async () => {
    mockService.deleteChallenge.mockResolvedValue({ message: 'ok' })
    await controller.deleteChallenge('ch-1')
    expect(mockService.deleteChallenge).toHaveBeenCalledWith('ch-1')
  })
})
