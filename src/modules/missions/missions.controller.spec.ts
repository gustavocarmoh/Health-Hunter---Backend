import { jest } from '@jest/globals'
import { MissionsController } from './missions.controller.js'
import { MissionsService } from './missions.service.js'

const mockService = {
  getMissionsForUser: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  generateDaily: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  createIndividual: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  updateMissionDone: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
}

describe('MissionsController', () => {
  let controller: MissionsController
  const user = { id: 'user-1' } as never

  beforeEach(() => {
    controller = new MissionsController(mockService as unknown as MissionsService)
    jest.clearAllMocks()
  })

  it('should list missions for the current user', async () => {
    mockService.getMissionsForUser.mockResolvedValue([])
    await controller.listMissions(user)
    expect(mockService.getMissionsForUser).toHaveBeenCalledWith('user-1')
  })

  it('should generate daily missions', async () => {
    mockService.generateDaily.mockResolvedValue([])
    await controller.generateDaily(user)
    expect(mockService.generateDaily).toHaveBeenCalledWith('user-1')
  })

  it('should create an individual mission for a target user', async () => {
    mockService.createIndividual.mockResolvedValue({ id: 'm1' })
    const body = { name: 'x', category: 'y', difficulty: 'z', xp: 10 }

    await controller.createIndividualMission('user-2', body)

    expect(mockService.createIndividual).toHaveBeenCalledWith('user-2', body)
  })

  it('should update the mission done status', async () => {
    mockService.updateMissionDone.mockResolvedValue({ id: 'm1', done: true })

    await controller.updateMissionDone('m1', user, { done: true })

    expect(mockService.updateMissionDone).toHaveBeenCalledWith('user-1', 'm1', true)
  })
})
