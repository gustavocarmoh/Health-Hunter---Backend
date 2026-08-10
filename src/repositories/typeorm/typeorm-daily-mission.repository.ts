import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, LessThan } from 'typeorm'
import { DailyMission } from '../../database/entities/daily-mission.entity'
import { DailyMissionRepository } from '../abstract/daily-mission.repository'

@Injectable()
export class TypeOrmDailyMissionRepository extends DailyMissionRepository {
  constructor(
    @InjectRepository(DailyMission) private readonly repo: Repository<DailyMission>,
  ) {
    super()
  }

  async create(data: Partial<DailyMission>): Promise<DailyMission> {
    const mission = this.repo.create(data)
    return this.repo.save(mission)
  }

  async findByUserIdAndDate(userId: string, date: Date): Promise<DailyMission[]> {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    return this.repo.find({
      where: {
        user_id: userId,
        daily: true,
      },
    })
  }

  async findExpiredAndIncomplete(): Promise<DailyMission[]> {
    return this.repo.find({
      where: {
        done: false,
        expires_at: LessThan(new Date()),
      },
    })
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id)
  }

  async deleteByUserIdAndExpired(userId: string, expiredAt: Date): Promise<number> {
    const result = await this.repo.delete({
      user_id: userId,
      expires_at: LessThan(expiredAt),
    })
    return result.affected || 0
  }
}
