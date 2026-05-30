import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { NotificationEntity } from '../../database/entities/notification.entity'
import { NotificationRepository } from '../abstract/notification.repository'
import { INotification } from '../../common/interfaces/notification.interface'

@Injectable()
export class TypeOrmNotificationRepository extends NotificationRepository {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly repo: Repository<NotificationEntity>,
  ) {
    super()
  }

  async create(data: Omit<INotification, 'id' | 'created_at'>): Promise<INotification> {
    const entity = this.repo.create(data as Partial<NotificationEntity>)
    return this.repo.save(entity)
  }

  async findByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ notifications: INotification[]; total: number }> {
    const [notifications, total] = await this.repo.findAndCount({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })
    return { notifications, total }
  }

  async markAllRead(userId: string): Promise<void> {
    await this.repo.update({ user_id: userId, is_read: false }, { is_read: true })
  }

  async markOneRead(id: string, userId: string): Promise<void> {
    await this.repo.update({ id, user_id: userId }, { is_read: true })
  }

  async deleteAllByUserId(userId: string): Promise<void> {
    await this.repo.delete({ user_id: userId })
  }
}
