import { IAchievement } from '../../common/interfaces/achievement.interface.js'

export abstract class AchievementRepository {
  abstract findAll(): Promise<IAchievement[]>

  abstract create(data: Omit<IAchievement, 'id' | 'created_at'>): Promise<IAchievement>
}
