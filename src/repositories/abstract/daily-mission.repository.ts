import { DailyMission } from '../../database/entities/daily-mission.entity'

export abstract class DailyMissionRepository {
  abstract create(data: Partial<DailyMission>): Promise<DailyMission>
  abstract findByUserIdAndDate(userId: string, date: Date): Promise<DailyMission[]>
  abstract findExpiredAndIncomplete(): Promise<DailyMission[]>
  abstract delete(id: string): Promise<void>
  abstract deleteByUserIdAndExpired(userId: string, expiredAt: Date): Promise<number>
}
