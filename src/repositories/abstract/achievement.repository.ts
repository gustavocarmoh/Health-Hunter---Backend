import { IAchievement } from '../../common/interfaces/achievement.interface'

export abstract class AchievementRepository {
  abstract findAll(): Promise<IAchievement[]>

  /** Cria uma nova conquista no catálogo. */
  abstract create(data: Omit<IAchievement, 'id' | 'created_at'>): Promise<IAchievement>
}
