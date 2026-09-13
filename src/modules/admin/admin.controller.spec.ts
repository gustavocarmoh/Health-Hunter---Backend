import { jest } from '@jest/globals'
import { AdminController } from './admin.controller.js'
import { AdminService } from './admin.service.js'

const asyncMock = () => jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>

const mockService = {
  getUsers: asyncMock(),
  assignRole: asyncMock(),
  assignRank: asyncMock(),
  createChallenge: asyncMock(),
  getAuditLogs: asyncMock(),
  getStats: asyncMock(),
  createEvent: asyncMock(),
  updateEvent: asyncMock(),
  getEventParticipants: asyncMock(),
  hardDeleteUser: asyncMock(),
  getAllEvents: asyncMock(),
  getAllChallenges: asyncMock(),
  updateChallenge: asyncMock(),
  createAchievement: asyncMock(),
  deleteEvent: asyncMock(),
}

describe('AdminController', () => {
  let controller: AdminController
  const admin = { id: 'admin-1' } as never

  beforeEach(() => {
    controller = new AdminController(mockService as unknown as AdminService)
    jest.clearAllMocks()
  })

  it('should list users with default paging', async () => {
    mockService.getUsers.mockResolvedValue({})
    await controller.getUsers(undefined, undefined, 'jin')
    expect(mockService.getUsers).toHaveBeenCalledWith(1, 20, 'jin')
  })

  it('should assign a role', async () => {
    mockService.assignRole.mockResolvedValue({})
    await controller.assignRole('u2', { role: 'ADMIN' } as never, admin)
    expect(mockService.assignRole).toHaveBeenCalledWith('u2', 'admin-1', { role: 'ADMIN' })
  })

  it('should assign a rank', async () => {
    mockService.assignRank.mockResolvedValue({})
    await controller.assignRank('u2', { rank_level: 'S' } as never, admin)
    expect(mockService.assignRank).toHaveBeenCalledWith('u2', 'admin-1', { rank_level: 'S' })
  })

  it('should create a challenge', async () => {
    mockService.createChallenge.mockResolvedValue({})
    const dto = { title: 'x' } as never
    await controller.createChallenge(dto)
    expect(mockService.createChallenge).toHaveBeenCalledWith(dto)
  })

  it('should get audit logs', async () => {
    mockService.getAuditLogs.mockResolvedValue({})
    await controller.getAuditLogs(undefined, undefined)
    expect(mockService.getAuditLogs).toHaveBeenCalledWith(1, 50)
  })

  it('should get system stats', async () => {
    mockService.getStats.mockResolvedValue({})
    await controller.getStats()
    expect(mockService.getStats).toHaveBeenCalled()
  })

  it('should create an event', async () => {
    mockService.createEvent.mockResolvedValue({})
    const dto = { title: 'x' } as never
    await controller.createEvent(dto, admin)
    expect(mockService.createEvent).toHaveBeenCalledWith(dto, 'admin-1')
  })

  it('should update an event', async () => {
    mockService.updateEvent.mockResolvedValue({})
    const dto = { title: 'y' } as never
    await controller.updateEvent('event-1', dto, admin)
    expect(mockService.updateEvent).toHaveBeenCalledWith('event-1', dto, 'admin-1')
  })

  it('should get event participants', async () => {
    mockService.getEventParticipants.mockResolvedValue({})
    await controller.getEventParticipants('event-1')
    expect(mockService.getEventParticipants).toHaveBeenCalledWith('event-1')
  })

  it('should hard delete a user', async () => {
    mockService.hardDeleteUser.mockResolvedValue({})
    await controller.deleteUser('u2', admin)
    expect(mockService.hardDeleteUser).toHaveBeenCalledWith('u2', 'admin-1')
  })

  it('should list all events with default paging', async () => {
    mockService.getAllEvents.mockResolvedValue({})
    await controller.getAllEvents(undefined, undefined)
    expect(mockService.getAllEvents).toHaveBeenCalledWith(1, 20)
  })

  it('should list all challenges with default paging', async () => {
    mockService.getAllChallenges.mockResolvedValue({})
    await controller.getAllChallenges(undefined, undefined)
    expect(mockService.getAllChallenges).toHaveBeenCalledWith(1, 20)
  })

  it('should update a challenge', async () => {
    mockService.updateChallenge.mockResolvedValue({})
    await controller.updateChallenge('ch-1', { title: 'y' }, admin)
    expect(mockService.updateChallenge).toHaveBeenCalledWith('ch-1', { title: 'y' }, 'admin-1')
  })

  it('should create an achievement', async () => {
    mockService.createAchievement.mockResolvedValue({})
    await controller.createAchievement({ title: 'x' })
    expect(mockService.createAchievement).toHaveBeenCalledWith({ title: 'x' })
  })

  it('should delete an event', async () => {
    mockService.deleteEvent.mockResolvedValue({})
    await controller.deleteEvent('event-1', admin)
    expect(mockService.deleteEvent).toHaveBeenCalledWith('event-1', 'admin-1')
  })
})
