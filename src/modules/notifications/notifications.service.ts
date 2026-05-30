import { Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { NotificationRepository } from '../../repositories/abstract/notification.repository'

@Injectable()
export class NotificationsService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async getMyNotifications(userId: string, page: number, limit: number) {
    return this.notificationRepository.findByUserId(userId, page, limit)
  }

  async markAllRead(userId: string) {
    await this.notificationRepository.markAllRead(userId)
    return { message: 'All notifications marked as read.' }
  }

  async markOneRead(id: string, userId: string) {
    await this.notificationRepository.markOneRead(id, userId)
    return { message: 'Notification marked as read.' }
  }

  async clearAll(userId: string) {
    await this.notificationRepository.deleteAllByUserId(userId)
    return { message: 'All notifications cleared.' }
  }

  @OnEvent('hunter.rank_up')
  async handleRankUp(payload: { hunter_id: string; new_rank: string; [key: string]: unknown }) {
    await this.notificationRepository.create({
      user_id: payload.hunter_id,
      type: 'RANK_UP',
      title: 'Você subiu de rank! 🎉',
      body: `Parabéns! Você alcançou o rank ${payload.new_rank}. Continue se superando!`,
      is_read: false,
    })
  }
}
