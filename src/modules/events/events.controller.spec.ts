import { jest } from '@jest/globals'
import { EventsController } from './events.controller.js'
import { EventsService } from './events.service.js'

const mockService = {
  getActiveEvents: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  getMyEvents: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  getEvent: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  joinEvent: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  leaveEvent: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  getLeaderboard: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
}

describe('EventsController', () => {
  let controller: EventsController
  const user = { id: 'user-1' } as never

  beforeEach(() => {
    controller = new EventsController(mockService as unknown as EventsService)
    jest.clearAllMocks()
  })

  it('should get active events for the current user', async () => {
    mockService.getActiveEvents.mockResolvedValue([])
    await controller.getActiveEvents(user)
    expect(mockService.getActiveEvents).toHaveBeenCalledWith('user-1')
  })

  it('should get the events the user is enrolled in', async () => {
    mockService.getMyEvents.mockResolvedValue({ total: 0 })
    await controller.getMyEvents(user)
    expect(mockService.getMyEvents).toHaveBeenCalledWith('user-1')
  })

  it('should get a single event', async () => {
    mockService.getEvent.mockResolvedValue({ id: 'event-1' })
    await controller.getEvent('event-1')
    expect(mockService.getEvent).toHaveBeenCalledWith('event-1')
  })

  it('should join an event', async () => {
    mockService.joinEvent.mockResolvedValue({ id: 'p1' })
    await controller.joinEvent('event-1', user)
    expect(mockService.joinEvent).toHaveBeenCalledWith('event-1', 'user-1')
  })

  it('should leave an event', async () => {
    mockService.leaveEvent.mockResolvedValue({ message: 'ok' })
    await controller.leaveEvent('event-1', user)
    expect(mockService.leaveEvent).toHaveBeenCalledWith('event-1', 'user-1')
  })

  it('should get the event leaderboard', async () => {
    mockService.getLeaderboard.mockResolvedValue({ leaderboard: [] })
    await controller.getLeaderboard('event-1')
    expect(mockService.getLeaderboard).toHaveBeenCalledWith('event-1')
  })
})
