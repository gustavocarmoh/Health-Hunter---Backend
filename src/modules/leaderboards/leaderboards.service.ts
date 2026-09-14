import { Injectable, NotFoundException } from '@nestjs/common'
import { UserRepository } from '../../repositories/abstract/user.repository.js'
import { FollowRepository } from '../../repositories/abstract/follow.repository.js'
import { RedisService } from '../../cache/redis.service.js'

const LEADERBOARD_SIZE = 100
const LEADERBOARD_TTL = 300 // 5 minutes

@Injectable()
export class LeaderboardsService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly followRepository: FollowRepository,
    private readonly redisService: RedisService,
  ) {}

  async getGlobal() {
    const cacheKey = 'leaderboard:global'
    const cached = await this.redisService.get(cacheKey)
    if (cached) return cached

    const users = await this.userRepository.findLeaderboard({}, LEADERBOARD_SIZE)
    const leaderboard = users.map((u, i) => ({
      position: i + 1,
      hunter_id: u.id,
      name: u.name,
      rank_level: u.rank_level,
      xp: u.xp,
      city: u.city,
      region_state: u.region_state,
      region_country: u.region_country,
    }))

    const result = { scope: 'global', leaderboard }
    await this.redisService.set(cacheKey, result, LEADERBOARD_TTL)
    return result
  }

  async getRegional(state?: string, country?: string) {
    const cacheKey = `leaderboard:regional:${state ?? ''}:${country ?? ''}`
    const cached = await this.redisService.get(cacheKey)
    if (cached) return cached

    const users = await this.userRepository.findLeaderboard(
      { region_state: state, region_country: country },
      LEADERBOARD_SIZE,
    )
    const leaderboard = users.map((u, i) => ({
      position: i + 1,
      hunter_id: u.id,
      name: u.name,
      rank_level: u.rank_level,
      xp: u.xp,
      region_state: u.region_state,
      region_country: u.region_country,
    }))

    const result = {
      scope: 'regional',
      filters: { state, country },
      leaderboard,
    }
    await this.redisService.set(cacheKey, result, LEADERBOARD_TTL)
    return result
  }

  async getLocal(city?: string, state?: string) {
    const cacheKey = `leaderboard:local:${city ?? ''}:${state ?? ''}`
    const cached = await this.redisService.get(cacheKey)
    if (cached) return cached

    const users = await this.userRepository.findLeaderboard(
      { city, region_state: state },
      LEADERBOARD_SIZE,
    )
    const leaderboard = users.map((u, i) => ({
      position: i + 1,
      hunter_id: u.id,
      name: u.name,
      rank_level: u.rank_level,
      xp: u.xp,
      city: u.city,
      region_state: u.region_state,
    }))

    const result = { scope: 'local', filters: { city, state }, leaderboard }
    await this.redisService.set(cacheKey, result, LEADERBOARD_TTL)
    return result
  }

  async getGlobalCursor(limit = 20, cursorParam?: string) {
    const cursor = cursorParam ? this.decodeCursor(cursorParam) : undefined
    const { data, nextCursor } = await this.userRepository.findLeaderboardCursor({}, limit, cursor)
    const leaderboard = data.map((u, _) => ({
      hunter_id: u.id,
      name: u.name,
      rank_level: u.rank_level,
      xp: u.xp,
      city: u.city,
      region_state: u.region_state,
      region_country: u.region_country,
    }))

    return {
      scope: 'global',
      leaderboard,
      nextCursor: nextCursor ? this.encodeCursor(nextCursor) : null,
    }
  }

  private encodeCursor(c: { xp: number; id: string }): string {
    return Buffer.from(JSON.stringify(c)).toString('base64url')
  }

  private decodeCursor(raw: string): { xp: number; id: string } {
    try {
      return JSON.parse(Buffer.from(raw, 'base64url').toString('utf-8')) as {
        xp: number
        id: string
      }
    } catch {
      throw new Error('Cursor inválido')
    }
  }

  async getMyPosition(userId: string) {
    const user = await this.userRepository.findById(userId)
    if (!user || user.is_deleted) throw new NotFoundException('Hunter not found.')

    const [globalPos, regionalPos, localPos] = await Promise.all([
      this.userRepository.countWithMoreXp(user.xp, {}),
      this.userRepository.countWithMoreXp(user.xp, {
        region_state: user.region_state,
        region_country: user.region_country,
      }),
      this.userRepository.countWithMoreXp(user.xp, {
        city: user.city,
        region_state: user.region_state,
      }),
    ])

    return {
      hunter_id: userId,
      xp: user.xp,
      rank_level: user.rank_level,
      positions: {
        global: globalPos + 1,
        regional: regionalPos + 1,
        local: localPos + 1,
      },
    }
  }

  async getFriendsLeaderboard(userId: string) {
    const followingIds = await this.followRepository.findFollowingIds(userId)
    if (followingIds.length === 0) return { total: 0, leaderboard: [] }

    const friends = await this.userRepository.findByIds(followingIds)
    const sorted = friends.filter((u) => !u.is_deleted).sort((a, b) => b.xp - a.xp)

    return {
      total: sorted.length,
      leaderboard: sorted.map((u, i) => ({
        position: i + 1,
        hunter_id: u.id,
        name: u.name,
        rank_level: u.rank_level,
        xp: u.xp,
        city: u.city,
        region_state: u.region_state,
      })),
    }
  }
}
