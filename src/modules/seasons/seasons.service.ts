import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { SeasonRepository } from '../../repositories/abstract/season.repository.js'
import { ActivityRepository } from '../../repositories/abstract/activity.repository.js'
import { UserRepository } from '../../repositories/abstract/user.repository.js'
import { ISeason } from '../../common/interfaces/season.interface.js'

@Injectable()
export class SeasonsService {
  private readonly logger = new Logger(SeasonsService.name)

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

  async createSeason(data: Omit<ISeason, 'id' | 'created_at'>) {
    await this.seasonRepository.deactivateAll()

    const season = await this.seasonRepository.create({
      ...data,
      is_active: true,
    })

    this.logger.log(`Season criada: ${season.title} (${season.id})`)
    return season
  }

  async endSeason(seasonId: string) {
    const season = await this.seasonRepository.findById(seasonId)
    if (!season) throw new NotFoundException('Season not found.')

    const topXp = await this.activityRepository.getTopByXpInPeriod(
      season.starts_at,
      season.ends_at,
      3,
    )

    this.logger.log(`Encerrando season ${season.title}. Top 3: ${topXp.length} hunters`)

    const rewards = [1000, 500, 250]
    for (let i = 0; i < topXp.length && i < rewards.length; i++) {
      const hunter = await this.userRepository.findById(topXp[i].user_id)
      if (hunter) {
        const newCoins = (hunter.coins || 0) + rewards[i]
        await this.userRepository.update(topXp[i].user_id, { coins: newCoins })
        this.logger.log(`Reward: ${hunter.name} recebeu ${rewards[i]} coins (position: ${i + 1})`)
      }
    }

    await this.seasonRepository.update(seasonId, { is_active: false })

    this.logger.log(`Season ${season.title} encerrada com sucesso`)
    return { message: `Season ${season.title} encerrada`, rewards_distributed: topXp.length }
  }
}
