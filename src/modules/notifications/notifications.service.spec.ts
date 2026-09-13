import { jest } from '@jest/globals'
import { NotificationsService } from './notifications.service.js'
import { NotificationRepository } from '../../repositories/abstract/notification.repository.js'

const asyncMock = () => jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>

const mockRepo = {
  findByUserId: asyncMock(),
  markAllRead: asyncMock(),
  markOneRead: asyncMock(),
  deleteAllByUserId: asyncMock(),
  create: asyncMock(),
}

describe('NotificationsService', () => {
  let service: NotificationsService

  beforeEach(() => {
    service = new NotificationsService(mockRepo as unknown as NotificationRepository)
    jest.clearAllMocks()
  })

  it('should return paginated notifications for a user', async () => {
    mockRepo.findByUserId.mockResolvedValue({ total: 0, data: [] })

    const result = await service.getMyNotifications('user-1', 1, 20)

    expect(mockRepo.findByUserId).toHaveBeenCalledWith('user-1', 1, 20)
    expect(result).toEqual({ total: 0, data: [] })
  })

  it('should mark all notifications as read', async () => {
    mockRepo.markAllRead.mockResolvedValue(undefined)

    const result = await service.markAllRead('user-1')

    expect(mockRepo.markAllRead).toHaveBeenCalledWith('user-1')
    expect(result).toEqual({ message: 'All notifications marked as read.' })
  })

  it('should mark a single notification as read', async () => {
    mockRepo.markOneRead.mockResolvedValue(undefined)

    const result = await service.markOneRead('notif-1', 'user-1')

    expect(mockRepo.markOneRead).toHaveBeenCalledWith('notif-1', 'user-1')
    expect(result).toEqual({ message: 'Notification marked as read.' })
  })

  it('should clear all notifications for a user', async () => {
    mockRepo.deleteAllByUserId.mockResolvedValue(undefined)

    const result = await service.clearAll('user-1')

    expect(mockRepo.deleteAllByUserId).toHaveBeenCalledWith('user-1')
    expect(result).toEqual({ message: 'All notifications cleared.' })
  })

  it('should create a rank-up notification when handling the hunter.rank_up event', async () => {
    mockRepo.create.mockResolvedValue(undefined)

    await service.handleRankUp({ hunter_id: 'user-1', new_rank: 'C' })

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        type: 'RANK_UP',
        is_read: false,
      }),
    )
  })
})
