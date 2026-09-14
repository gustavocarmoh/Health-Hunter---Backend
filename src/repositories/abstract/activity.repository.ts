import { IActivityLog } from '../../common/interfaces/activity.interface.js'

export abstract class ActivityRepository {
  abstract create(activity: Omit<IActivityLog, 'id' | 'logged_at'>): Promise<IActivityLog>

  abstract findByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ activities: IActivityLog[]; total: number }>

  abstract findAllByUserId(userId: string): Promise<IActivityLog[]>

  abstract findByUserIdSince(userId: string, since: Date): Promise<IActivityLog[]>

  abstract countAll(since?: Date): Promise<number>

  abstract sumXpAll(since?: Date): Promise<number>

  abstract findById(id: string): Promise<IActivityLog | null>

  abstract findByUserIds(userIds: string[], limit: number): Promise<IActivityLog[]>

  abstract getTopByXpInPeriod(
    startsAt: Date,
    endsAt: Date,
    limit: number,
  ): Promise<{ user_id: string; total_xp: number }[]>

  abstract update(id: string, data: Partial<IActivityLog>): Promise<IActivityLog>

  abstract delete(id: string): Promise<void>
}
