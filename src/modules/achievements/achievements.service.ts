import { Injectable, NotFoundException } from '@nestjs/common'
import { AchievementRepository } from '../../repositories/abstract/achievement.repository'
import { UserRepository } from '../../repositories/abstract/user.repository'
import { ActivityRepository } from '../../repositories/abstract/activity.repository'
import { RANK_ORDER } from '../../common/enums/rank.enum'

@Injectable()
export class AchievementsService {
  constructor(
    private readonly achievementRepository: AchievementRepository,
    private readonly userRepository: UserRepository,
    private readonly activityRepository: ActivityRepository,
  ) {}

  async getCatalog() {
    const achievements = await this.achievementRepository.findAll()
    return { total: achievements.length, achievements }
  }

  async getMyAchievements(userId: string) {
    const user = await this.userRepository.findById(userId)
    if (!user || user.is_deleted) throw new NotFoundException('Hunter not found.')

    const [achievements, activities] = await Promise.all([
      this.achievementRepository.findAll(),
      this.activityRepository.findAllByUserId(userId),
    ])

    const totalActivities = activities.length
    const totalDistanceKm = activities.reduce((sum, a) => sum + a.distancia_m, 0) / 1000
    const rankIndex = RANK_ORDER.indexOf(user.rank_level)

    return {
      hunter_id: userId,
      total: achievements.length,
      achievements: achievements.map((a) => {
        let is_unlocked = false

        switch (a.condition_type) {
          case 'ACTIVITIES_COUNT':
            is_unlocked = totalActivities >= a.condition_value
            break
          case 'DISTANCE_KM':
            is_unlocked = totalDistanceKm >= a.condition_value
            break
          case 'RANK_REACHED':
            is_unlocked = rankIndex >= a.condition_value
            break
        }

        return { ...a, is_unlocked }
      }),
    }
  }
}
