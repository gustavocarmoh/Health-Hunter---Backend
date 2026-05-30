import { Injectable, NotFoundException } from '@nestjs/common'
import { SeasonRepository } from '../../repositories/abstract/season.repository'
import { ActivityRepository } from '../../repositories/abstract/activity.repository'
import { UserRepository } from '../../repositories/abstract/user.repository'

@Injectable()
export class SeasonsService {
  constructor(
    private readonly seasonRepository: SeasonRepository,
    private readonly activityRepository: ActivityRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async getCurrent() {
    const season = await this.seasonRepository.findCurrent()
    if (!season) return { active: false, season: null }
    return { active: true, season }
  }

  async getSeasonLeaderboard(seasonId: string) {
    const season = await this.seasonRepository.findById(seasonId)
    if (!season) throw new NotFoundException('Season not found.')

    const topXp = await this.activityRepository.getTopByXpInPeriod(
      season.starts_at,
      season.ends_at,
      100,
    )

    if (topXp.length === 0) {
      return {
        season_id: seasonId,
        season_title: season.title,
        leaderboard: [],
      }
    }

    const userIds = topXp.map((r) => r.user_id)
    const users = await this.userRepository.findByIds(userIds)
    const userMap = new Map(users.map((u) => [u.id, u]))

    return {
      season_id: seasonId,
      season_title: season.title,
      xp_multiplier: season.xp_multiplier,
      period: { starts_at: season.starts_at, ends_at: season.ends_at },
      leaderboard: topXp.map((r, i) => {
        const u = userMap.get(r.user_id)
        return {
          position: i + 1,
          hunter_id: r.user_id,
          name: u?.name ?? 'Unknown',
          rank_level: u?.rank_level ?? null,
          total_xp_this_season: r.total_xp,
        }
      }),
    }
  }
}
