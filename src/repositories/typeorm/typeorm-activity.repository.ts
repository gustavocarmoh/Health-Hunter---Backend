import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { ActivityLogEntity } from '../../database/entities/activity-log.entity'
import { ActivityRepository } from '../abstract/activity.repository'
import { IActivityLog } from '../../common/interfaces/activity.interface'

@Injectable()
export class TypeOrmActivityRepository extends ActivityRepository {
  constructor(
    @InjectRepository(ActivityLogEntity)
    private readonly repo: Repository<ActivityLogEntity>,
  ) {
    super()
  }

  async create(activityData: Omit<IActivityLog, 'id' | 'logged_at'>): Promise<IActivityLog> {
    const entity = this.repo.create(activityData as Partial<ActivityLogEntity>)
    return this.repo.save(entity)
  }

  async findByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ activities: IActivityLog[]; total: number }> {
    const [activities, total] = await this.repo.findAndCount({
      where: { user_id: userId },
      order: { logged_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })
    return { activities, total }
  }

  async findAllByUserId(userId: string): Promise<IActivityLog[]> {
    return this.repo.find({
      where: { user_id: userId },
      order: { logged_at: 'DESC' },
    })
  }

  async findByUserIdSince(userId: string, since: Date): Promise<IActivityLog[]> {
    return this.repo
      .createQueryBuilder('a')
      .where('a.user_id = :userId', { userId })
      .andWhere('a.logged_at >= :since', { since })
      .orderBy('a.logged_at', 'DESC')
      .getMany()
  }

  async countAll(since?: Date): Promise<number> {
    const qb = this.repo.createQueryBuilder('a')
    if (since) qb.where('a.logged_at >= :since', { since })
    return qb.getCount()
  }

  async sumXpAll(since?: Date): Promise<number> {
    const qb = this.repo.createQueryBuilder('a').select('COALESCE(SUM(a.xp_gained), 0)', 'total')
    if (since) qb.where('a.logged_at >= :since', { since })
    const result = await qb.getRawOne<{ total: string }>()
    return parseInt(result?.total ?? '0', 10)
  }

  async findById(id: string): Promise<IActivityLog | null> {
    return this.repo.findOne({ where: { id } })
  }

  async findByUserIds(userIds: string[], limit: number): Promise<IActivityLog[]> {
    if (userIds.length === 0) return []
    return this.repo.find({
      where: { user_id: In(userIds) },
      order: { logged_at: 'DESC' },
      take: limit,
    })
  }

  async getTopByXpInPeriod(
    startsAt: Date,
    endsAt: Date,
    limit: number,
  ): Promise<{ user_id: string; total_xp: number }[]> {
    const rows = await this.repo
      .createQueryBuilder('a')
      .select('a.user_id', 'user_id')
      .addSelect('SUM(a.xp_gained)', 'total_xp')
      .where('a.logged_at >= :startsAt', { startsAt })
      .andWhere('a.logged_at <= :endsAt', { endsAt })
      .groupBy('a.user_id')
      .orderBy('total_xp', 'DESC')
      .limit(limit)
      .getRawMany<{ user_id: string; total_xp: string }>()
    return rows.map((r) => ({
      user_id: r.user_id,
      total_xp: parseInt(r.total_xp, 10),
    }))
  }
}
