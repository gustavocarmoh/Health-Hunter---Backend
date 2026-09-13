import { jest } from '@jest/globals'
import { HuntersController } from './hunters.controller.js'
import { HuntersService } from './hunters.service.js'

const asyncMock = () => jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>

const mockService = {
  getProfile: asyncMock(),
  updateProfile: asyncMock(),
  deleteAccount: asyncMock(),
  getStats: asyncMock(),
  getXpHistory: asyncMock(),
  getPublicProfile: asyncMock(),
  follow: asyncMock(),
  unfollow: asyncMock(),
  getFollowers: asyncMock(),
  getFollowing: asyncMock(),
  getFeed: asyncMock(),
  getFriends: asyncMock(),
  searchHunters: asyncMock(),
  getSuggested: asyncMock(),
  allocateStat: asyncMock(),
  logMeasurement: asyncMock(),
  getMeasurements: asyncMock(),
}

describe('HuntersController', () => {
  let controller: HuntersController
  const user = { id: 'user-1' } as never

  beforeEach(() => {
    controller = new HuntersController(mockService as unknown as HuntersService)
    jest.clearAllMocks()
  })

  it('should get the current profile', async () => {
    mockService.getProfile.mockResolvedValue({})
    await controller.getProfile(user)
    expect(mockService.getProfile).toHaveBeenCalledWith('user-1')
  })

  it('should update the current profile', async () => {
    mockService.updateProfile.mockResolvedValue({})
    await controller.updateProfile(user, { name: 'New' } as never)
    expect(mockService.updateProfile).toHaveBeenCalledWith('user-1', { name: 'New' })
  })

  it('should delete the account', async () => {
    mockService.deleteAccount.mockResolvedValue({ message: 'ok' })
    await controller.deleteAccount(user)
    expect(mockService.deleteAccount).toHaveBeenCalledWith('user-1')
  })

  it('should get stats', async () => {
    mockService.getStats.mockResolvedValue({})
    await controller.getStats(user)
    expect(mockService.getStats).toHaveBeenCalledWith('user-1')
  })

  it('should get xp history with numeric page/limit', async () => {
    mockService.getXpHistory.mockResolvedValue({})
    await controller.getXpHistory(user, '2' as never, '10' as never)
    expect(mockService.getXpHistory).toHaveBeenCalledWith('user-1', 2, 10)
  })

  it('should get a public profile', async () => {
    mockService.getPublicProfile.mockResolvedValue({})
    await controller.getPublicProfile('u2')
    expect(mockService.getPublicProfile).toHaveBeenCalledWith('u2')
  })

  it('should follow a hunter', async () => {
    mockService.follow.mockResolvedValue({})
    await controller.follow('u2', user)
    expect(mockService.follow).toHaveBeenCalledWith('user-1', 'u2')
  })

  it('should unfollow a hunter', async () => {
    mockService.unfollow.mockResolvedValue({})
    await controller.unfollow('u2', user)
    expect(mockService.unfollow).toHaveBeenCalledWith('user-1', 'u2')
  })

  it('should get followers', async () => {
    mockService.getFollowers.mockResolvedValue({})
    await controller.getFollowers('u2')
    expect(mockService.getFollowers).toHaveBeenCalledWith('u2')
  })

  it('should get following', async () => {
    mockService.getFollowing.mockResolvedValue({})
    await controller.getFollowing('u2')
    expect(mockService.getFollowing).toHaveBeenCalledWith('u2')
  })

  it('should get the feed', async () => {
    mockService.getFeed.mockResolvedValue({})
    await controller.getFeed(user, '15' as never)
    expect(mockService.getFeed).toHaveBeenCalledWith('user-1', 15)
  })

  it('should get friends', async () => {
    mockService.getFriends.mockResolvedValue({})
    await controller.getFriends(user, '1' as never, '50' as never)
    expect(mockService.getFriends).toHaveBeenCalledWith('user-1', 1, 50)
  })

  it('should search hunters', async () => {
    mockService.searchHunters.mockResolvedValue({})
    await controller.searchHunters(user, 'jin', '20' as never)
    expect(mockService.searchHunters).toHaveBeenCalledWith('user-1', 'jin', 20)
  })

  it('should get suggested hunters', async () => {
    mockService.getSuggested.mockResolvedValue({})
    await controller.getSuggested(user, '10' as never)
    expect(mockService.getSuggested).toHaveBeenCalledWith('user-1', 10)
  })

  it('should allocate a stat point', async () => {
    mockService.allocateStat.mockResolvedValue({})
    await controller.allocateStat(user, { attribute: 'strength' })
    expect(mockService.allocateStat).toHaveBeenCalledWith('user-1', 'strength')
  })

  it('should log a body measurement', async () => {
    mockService.logMeasurement.mockResolvedValue({})
    await controller.logMeasurement(user, { weight_kg: 70 })
    expect(mockService.logMeasurement).toHaveBeenCalledWith('user-1', { weight_kg: 70 })
  })

  it('should get measurements', async () => {
    mockService.getMeasurements.mockResolvedValue({})
    await controller.getMeasurements(user, '1' as never, '20' as never)
    expect(mockService.getMeasurements).toHaveBeenCalledWith('user-1', 1, 20)
  })
})
