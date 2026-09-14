import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common'
import { UserRepository } from '../../repositories/abstract/user.repository.js'
import { ActivityRepository } from '../../repositories/abstract/activity.repository.js'
import { FollowRepository } from '../../repositories/abstract/follow.repository.js'
import { BodyMeasurementRepository } from '../../repositories/abstract/body-measurement.repository.js'
import { RedisService } from '../../cache/redis.service.js'
import { UpdateHunterProfileDto } from './dto/update-hunter-profile.dto.js'
import { IUser } from '../../common/interfaces/user.interface.js'

const PROFILE_TTL = 30 // seconds

@Injectable()
export class HuntersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly activityRepository: ActivityRepository,
    private readonly followRepository: FollowRepository,
    private readonly bodyMeasurementRepository: BodyMeasurementRepository,
    private readonly redisService: RedisService,
  ) {}

  async getProfile(userId: string): Promise<Omit<IUser, 'password_hash'>> {
    const cacheKey = `hunter:profile:${userId}`
    const cached = await this.redisService.get<Omit<IUser, 'password_hash'>>(cacheKey)
    if (cached) return cached

    const user = await this.userRepository.findById(userId)
    if (!user || user.is_deleted) throw new NotFoundException('Hunter not found.')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash: _pw, ...profile } = user

    await this.redisService.set(cacheKey, profile, PROFILE_TTL)
    return profile
  }

  async updateProfile(
    userId: string,
    dto: UpdateHunterProfileDto,
  ): Promise<Omit<IUser, 'password_hash'>> {
    const updated = await this.userRepository.update(userId, dto)
    if (!updated) throw new NotFoundException('Hunter not found.')

    await this.redisService.del(`hunter:profile:${userId}`)

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash: _pw, ...profile } = updated
    return profile
  }

  async deleteAccount(userId: string): Promise<{ message: string }> {
    const user = await this.userRepository.findById(userId)
    if (!user) throw new NotFoundException('Hunter not found.')

    // LGPD: anonimiza PII mas mantém o registro para não quebrar integridade
    // referencial em leaderboards históricos.
    await this.userRepository.update(userId, {
      email: `deleted_${userId}@anon.invalid`,
      name: 'DELETED_USER',
      is_deleted: true,
      anonymized_at: new Date(),
      region_state: '',
      region_country: '',
      city: '',
    })

    await this.redisService.del(`hunter:profile:${userId}`)

    return {
      message: 'Account deleted and personal data anonymized per LGPD.',
    }
  }

  async getStats(userId: string): Promise<Record<string, unknown>> {
    const user = await this.userRepository.findById(userId)
    if (!user || user.is_deleted) throw new NotFoundException('Hunter not found.')

    const activities = await this.activityRepository.findAllByUserId(userId)

    const total_activities = activities.length
    const total_distance_m = activities.reduce((sum, a) => sum + a.distancia_m, 0)
    const total_duration_seg = activities.reduce((sum, a) => sum + a.duracao_seg, 0)
    const total_xp_earned = activities.reduce((sum, a) => sum + a.xp_gained, 0)
    const total_coins_earned = activities.reduce((sum, a) => sum + a.coins_gained, 0)
    // bpm_medio pode ser nulo em atividades com mais de 90 dias (expurgo LGPD) —
    // a média considera só as atividades com o dado ainda disponível.
    const activitiesWithBpm = activities.filter((a) => a.bpm_medio !== null)
    const avg_bpm =
      activitiesWithBpm.length > 0
        ? activitiesWithBpm.reduce((sum, a) => sum + (a.bpm_medio ?? 0), 0) /
          activitiesWithBpm.length
        : 0

    const exercise_breakdown = activities.reduce<Record<string, number>>((acc, a) => {
      acc[a.tipo_exercicio] = (acc[a.tipo_exercicio] ?? 0) + 1
      return acc
    }, {})

    return {
      hunter_id: userId,
      rank_level: user.rank_level,
      current_xp: user.xp,
      current_coins: user.coins,
      total_activities,
      total_distance_km: parseFloat((total_distance_m / 1000).toFixed(2)),
      total_duration_hours: parseFloat((total_duration_seg / 3600).toFixed(2)),
      total_xp_earned,
      total_coins_earned,
      avg_bpm: parseFloat(avg_bpm.toFixed(1)),
      exercise_breakdown,
    }
  }

  async getXpHistory(userId: string, page: number, limit: number) {
    const all = await this.activityRepository.findAllByUserId(userId)
    const total = all.length
    const offset = (page - 1) * limit
    const items = all.slice(offset, offset + limit).map((a) => ({
      id: a.id,
      tipo_exercicio: a.tipo_exercicio,
      xp_gained: a.xp_gained,
      coins_gained: a.coins_gained,
      logged_at: a.logged_at,
    }))
    return { total, page, limit, activities: items }
  }

  async getPublicProfile(targetId: string) {
    const user = await this.userRepository.findById(targetId)
    if (!user || user.is_deleted) throw new NotFoundException('Hunter not found.')
    return {
      id: user.id,
      name: user.name,
      rank_level: user.rank_level,
      xp: user.xp,
      city: user.city,
      region_state: user.region_state,
    }
  }

  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('You cannot follow yourself.')
    }
    const target = await this.userRepository.findById(followingId)
    if (!target || target.is_deleted) throw new NotFoundException('Hunter not found.')

    const result = await this.followRepository.follow(followerId, followingId)
    return { message: 'Now following.', follow: result }
  }

  async unfollow(followerId: string, followingId: string) {
    await this.followRepository.unfollow(followerId, followingId)
    return { message: 'Unfollowed successfully.' }
  }

  async getFollowers(targetId: string) {
    const target = await this.userRepository.findById(targetId)
    if (!target || target.is_deleted) throw new NotFoundException('Hunter not found.')

    const [followerIds, followersCount, followingCount] = await Promise.all([
      this.followRepository.findFollowerIds(targetId),
      this.followRepository.countFollowers(targetId),
      this.followRepository.countFollowing(targetId),
    ])

    const followers = followerIds.length > 0 ? await this.userRepository.findByIds(followerIds) : []

    return {
      hunter_id: targetId,
      followers_count: followersCount,
      following_count: followingCount,
      followers: followers.map((u) => ({
        id: u.id,
        name: u.name,
        rank_level: u.rank_level,
        xp: u.xp,
      })),
    }
  }

  async getFollowing(targetId: string) {
    const target = await this.userRepository.findById(targetId)
    if (!target || target.is_deleted) throw new NotFoundException('Hunter not found.')

    const followingIds = await this.followRepository.findFollowingIds(targetId)
    const following =
      followingIds.length > 0 ? await this.userRepository.findByIds(followingIds) : []

    return {
      hunter_id: targetId,
      following_count: followingIds.length,
      following: following.map((u) => ({
        id: u.id,
        name: u.name,
        rank_level: u.rank_level,
        xp: u.xp,
      })),
    }
  }

  async getFeed(userId: string, limit: number) {
    const followingIds = await this.followRepository.findFollowingIds(userId)
    if (followingIds.length === 0) return { total: 0, activities: [] }

    const activities = await this.activityRepository.findByUserIds(
      followingIds,
      Math.min(limit, 100),
    )

    const userIds = [...new Set(activities.map((a) => a.user_id))]
    const users = await this.userRepository.findByIds(userIds)
    const userMap = new Map(users.map((u) => [u.id, u]))

    return {
      total: activities.length,
      activities: activities.map((a) => ({
        id: a.id,
        user_id: a.user_id,
        hunter_name: userMap.get(a.user_id)?.name ?? 'Unknown',
        tipo_exercicio: a.tipo_exercicio,
        distancia_km: parseFloat((a.distancia_m / 1000).toFixed(2)),
        xp_gained: a.xp_gained,
        logged_at: a.logged_at,
      })),
    }
  }

  async getSuggested(userId: string, limit: number) {
    const user = await this.userRepository.findById(userId)
    if (!user || user.is_deleted) throw new NotFoundException('Hunter not found.')

    const followingIds = await this.followRepository.findFollowingIds(userId)
    const excludeIds = [...followingIds, userId]

    const suggested = await this.userRepository.findSuggested(
      user.region_state,
      user.rank_level,
      excludeIds,
      Math.min(limit, 50),
    )

    return {
      total: suggested.length,
      suggestions: suggested.map((u) => ({
        id: u.id,
        name: u.name,
        rank_level: u.rank_level,
        xp: u.xp,
        city: u.city,
        region_state: u.region_state,
      })),
    }
  }

  async logMeasurement(userId: string, body: Record<string, unknown>) {
    const user = await this.userRepository.findById(userId)
    if (!user || user.is_deleted) throw new NotFoundException('Hunter not found.')

    const weight_kg = typeof body.weight_kg === 'number' ? body.weight_kg : null
    const height_cm = typeof body.height_cm === 'number' ? body.height_cm : null
    const body_fat_pct = typeof body.body_fat_pct === 'number' ? body.body_fat_pct : null
    const measured_at =
      typeof body.measured_at === 'string' ? new Date(body.measured_at) : new Date()

    if (weight_kg === null && height_cm === null && body_fat_pct === null) {
      throw new BadRequestException(
        'At least one measurement field is required: weight_kg, height_cm, body_fat_pct.',
      )
    }

    return this.bodyMeasurementRepository.create({
      user_id: userId,
      weight_kg,
      height_cm,
      body_fat_pct,
      measured_at,
    })
  }

  async getMeasurements(userId: string, page: number, limit: number) {
    const user = await this.userRepository.findById(userId)
    if (!user || user.is_deleted) throw new NotFoundException('Hunter not found.')
    return this.bodyMeasurementRepository.findByUserId(userId, page, limit)
  }

  async getFriends(userId: string, page: number, limit: number) {
    const user = await this.userRepository.findById(userId)
    if (!user || user.is_deleted) throw new NotFoundException('Hunter not found.')

    const followingIds = await this.followRepository.findFollowingIds(userId)
    if (followingIds.length === 0) {
      return {
        total: 0,
        page,
        limit,
        friends: [],
      }
    }

    const friends = await this.userRepository.findByIds(followingIds)
    return {
      total: friends.length,
      page,
      limit,
      friends: friends.map((u) => ({
        id: u.id,
        name: u.name,
        rank: u.rank_level,
        xp: u.xp,
      })),
    }
  }

  async searchHunters(userId: string, query: string, limit: number) {
    if (!query || query.trim().length < 2) {
      throw new BadRequestException('Search query must be at least 2 characters.')
    }

    const user = await this.userRepository.findById(userId)
    if (!user || user.is_deleted) throw new NotFoundException('Hunter not found.')

    const searchResults = await this.userRepository.findByNameContains(
      query.trim(),
      Math.min(limit, 50),
    )

    const followingIds = await this.followRepository.findFollowingIds(userId)
    const followingSet = new Set(followingIds)

    return {
      query,
      total: searchResults.length,
      results: searchResults
        .filter((u) => u.id !== userId)
        .map((u) => ({
          id: u.id,
          name: u.name,
          rank: u.rank_level,
          xp: u.xp,
          is_following: followingSet.has(u.id),
        })),
    }
  }

  async allocateStat(userId: string, attribute: string) {
    const user = await this.userRepository.findById(userId)
    if (!user || user.is_deleted) throw new NotFoundException('Hunter not found.')

    if (user.stat_points_available <= 0) {
      throw new ConflictException('You have no stat points available to distribute.')
    }

    const validAttributes = ['strength', 'intel', 'vitality', 'sense', 'agility']
    if (!validAttributes.includes(attribute)) {
      throw new BadRequestException(
        `Invalid attribute. Must be one of: ${validAttributes.join(', ')}`,
      )
    }

    const update: Record<string, number> = {
      stat_points_available: user.stat_points_available - 1,
      [attribute]: (user[attribute as keyof IUser] as number) + 1,
    }

    const updated = await this.userRepository.update(userId, update as Partial<IUser>)
    await this.redisService.del(`hunter:profile:${userId}`)

    return {
      message: `${attribute.charAt(0).toUpperCase() + attribute.slice(1)} increased by 1.`,
      stats: {
        strength: updated?.strength || 0,
        intel: updated?.intel || 0,
        vitality: updated?.vitality || 0,
        sense: updated?.sense || 0,
        agility: updated?.agility || 0,
        stat_points_available: updated?.stat_points_available || 0,
      },
    }
  }
}
