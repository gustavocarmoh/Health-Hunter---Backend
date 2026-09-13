import { jest } from '@jest/globals'
import { NotificationsController } from './notifications.controller.js'
import { NotificationsService } from './notifications.service.js'

const mockService = {
  getMyNotifications: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  markAllRead: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  markOneRead: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  clearAll: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
}

describe('NotificationsController', () => {
  let controller: NotificationsController
  const user = { id: 'user-1' } as never

  beforeEach(() => {
    controller = new NotificationsController(mockService as unknown as NotificationsService)
    jest.clearAllMocks()
  })

  it('should get paginated notifications with default page/limit', async () => {
    mockService.getMyNotifications.mockResolvedValue({ total: 0 })

    await controller.getMyNotifications(user, 1, 20)

    expect(mockService.getMyNotifications).toHaveBeenCalledWith('user-1', 1, 20)
  })

  it('should mark all as read', async () => {
    mockService.markAllRead.mockResolvedValue({ message: 'ok' })

    await controller.markAllRead(user)

    expect(mockService.markAllRead).toHaveBeenCalledWith('user-1')
  })

  it('should mark one notification as read', async () => {
    mockService.markOneRead.mockResolvedValue({ message: 'ok' })

    await controller.markOneRead('notif-1', user)

    expect(mockService.markOneRead).toHaveBeenCalledWith('notif-1', 'user-1')
  })

  it('should clear all notifications', async () => {
    mockService.clearAll.mockResolvedValue({ message: 'ok' })

    await controller.clearAll(user)

    expect(mockService.clearAll).toHaveBeenCalledWith('user-1')
  })
})
