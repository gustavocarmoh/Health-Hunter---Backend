import { INotification } from '../../common/interfaces/notification.interface.js'

export abstract class NotificationRepository {
  abstract create(data: Omit<INotification, 'id' | 'created_at'>): Promise<INotification>

  abstract findByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ notifications: INotification[]; total: number }>

  abstract markAllRead(userId: string): Promise<void>

  /** Marca uma notificação específica do usuário como lida. */
  abstract markOneRead(id: string, userId: string): Promise<void>

  /** Remove todas as notificações do usuário. */
  abstract deleteAllByUserId(userId: string): Promise<void>
}
