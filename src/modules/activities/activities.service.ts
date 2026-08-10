import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { ActivityRepository } from '../../repositories/abstract/activity.repository'
import { UserRepository } from '../../repositories/abstract/user.repository'
import { RedisService } from '../../cache/redis.service'
import { RankEngineService } from '../../common/rank/rank-engine.service'
import { LogActivityDto } from './dto/log-activity.dto'
import { UpdateActivityDto } from './dto/update-activity.dto'
import { RANK_XP_MULTIPLIERS } from '../../common/enums/rank.enum'

const XP_BASE_PER_ACTIVITY = 100
const COINS_BASE_PER_ACTIVITY = 50

// Anti-fraud thresholds
const MAX_SPEED_KMH = 50 // ~world record sprint pace with margin

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly activityRepository: ActivityRepository,
    private readonly userRepository: UserRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly redisService: RedisService,
    private readonly rankEngineService: RankEngineService,
  ) {}

  /**
   * Processa e persiste uma atividade física concluída.
   *
   * Pipeline:
   * 1. Valida anti-fraude: velocidade máx. 50 km/h
   * 2. Calcula XP e coins com multiplicador de rank do Hunter
   * 3. Persiste o `ActivityLog`
   * 4. Atualiza XP e coins totais do Hunter
   * 5. Verifica promoção de rank (XP acumulado ≥ threshold do próximo rank)
   * 6. Invalida caches: `hunter:profile:{userId}` e padrão `leaderboard:*`
   * 7. Emite evento assíncrono `activity.completed` via EventEmitter2
   *
   * @param userId - UUID do Hunter autenticado
   * @param dto - Dados da atividade (distância, duração, GPS, BPM...)
   * @returns Resumo com `activity_id`, `xp_gained`, `coins_gained` e totais
   * @throws NotFoundException se o Hunter não for encontrado
   * @throws BadRequestException se a velocidade calculada exceder 50 km/h
   */
  async logActivity(userId: string, dto: LogActivityDto) {
    const user = await this.userRepository.findById(userId)
    if (!user || user.is_deleted) throw new NotFoundException('Hunter not found.')

    // Anti-fraud: speed check
    const speedKmh = dto.distancia_m / 1000 / (dto.duracao_seg / 3600)
    if (speedKmh > MAX_SPEED_KMH) {
      throw new BadRequestException(
        `Impossible speed detected (${speedKmh.toFixed(1)} km/h). Activity rejected.`,
      )
    }

    const multiplier = RANK_XP_MULTIPLIERS[user.rank_level]
    const xp_gained = Math.round(XP_BASE_PER_ACTIVITY * multiplier)
    const coins_gained = Math.round(COINS_BASE_PER_ACTIVITY * multiplier)

    const activity = await this.activityRepository.create({
      user_id: userId,
      distancia_m: dto.distancia_m,
      duracao_seg: dto.duracao_seg,
      tipo_exercicio: dto.tipo_exercicio,
      coordenadas_gps: dto.coordenadas_gps,
      bpm_medio: dto.bpm_medio,
      xp_gained,
      coins_gained,
    })

    const newXp = user.xp + xp_gained
    const newCoins = user.coins + coins_gained

    await this.userRepository.update(userId, { xp: newXp, coins: newCoins })

    // Check for rank up (uses dynamic regional-pressure threshold)
    await this.rankEngineService.checkPromotion(user, newXp, this.eventEmitter)

    // Invalidate stale caches
    await this.redisService.del(`hunter:profile:${userId}`)
    await this.redisService.invalidatePattern('leaderboard:*')

    // Async telemetry event
    this.eventEmitter.emit('activity.completed', {
      activity,
      hunter_id: userId,
      hunter_rank: user.rank_level,
    })

    return {
      activity_id: activity.id,
      xp_gained,
      coins_gained,
      total_xp: newXp,
      total_coins: newCoins,
    }
  }

  /**
   * Retorna o histórico paginado de atividades de um Hunter.
   *
   * @param userId - UUID do Hunter
   * @param page - Número da página (início em 1)
   * @param limit - Máximo de itens por página
   * @returns Lista paginada de `ActivityLog`
   */
  async getHistory(userId: string, page: number, limit: number) {
    return this.activityRepository.findByUserId(userId, page, limit)
  }

  /**
   * Gera um resumo agregado das atividades do Hunter.
   *
   * Retorna métricas separadas para os períodos de 7 dias (weekly)
   * e 30 dias (monthly) a partir do momento da chamada.
   *
   * @param userId - UUID do Hunter
   * @returns Objeto com `weekly` e `monthly` contendo distância, duração, BPM médio e XP
   * @throws NotFoundException se o Hunter não existir ou estiver deletado
   */
  async getSummary(userId: string) {
    const user = await this.userRepository.findById(userId)
    if (!user || user.is_deleted) throw new NotFoundException('Hunter not found.')

    const activities = await this.activityRepository.findAllByUserId(userId)
    const now = new Date()

    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const weekly = activities.filter((a) => a.logged_at >= weekAgo)
    const monthly = activities.filter((a) => a.logged_at >= monthAgo)

    return {
      hunter_id: userId,
      summary_generated_at: now.toISOString(),
      weekly: this.aggregate(weekly),
      monthly: this.aggregate(monthly),
    }
  }

  /**
   * Agrega métricas de uma lista de atividades.
   *
   * @param activities - Array de atividades com campos numéricos
   * @returns Objeto com `count`, distância, duração, BPM médio e XP total
   */
  private aggregate(
    activities: {
      distancia_m: number
      duracao_seg: number
      bpm_medio: number
      xp_gained: number
    }[],
  ) {
    const count = activities.length
    if (count === 0)
      return {
        count: 0,
        total_distance_km: 0,
        total_duration_hours: 0,
        avg_bpm: 0,
        total_xp: 0,
      }
    return {
      count,
      total_distance_km: parseFloat(
        (activities.reduce((s, a) => s + a.distancia_m, 0) / 1000).toFixed(2),
      ),
      total_duration_hours: parseFloat(
        (activities.reduce((s, a) => s + a.duracao_seg, 0) / 3600).toFixed(2),
      ),
      avg_bpm: parseFloat((activities.reduce((s, a) => s + a.bpm_medio, 0) / count).toFixed(1)),
      total_xp: activities.reduce((s, a) => s + a.xp_gained, 0),
    }
  }

  /**
   * Verifica se o Hunter deve subir de rank após ganhar XP.
   *
   * Compara o XP total acumulado com o threshold do próximo rank.
   * Em caso de promoção, atualiza o banco e emite o evento `hunter.rank_up`.
   * Hunters no Rank S não são processados.
   *
   * @param userId - UUID do Hunter
   * @returns Objeto com informações da atividade
   * @throws NotFoundException se a atividade não existir ou não pertencer ao Hunter
   */
  async getActivity(id: string, userId: string) {
    const activity = await this.activityRepository.findById(id)
    if (!activity || activity.user_id !== userId) {
      throw new NotFoundException('Activity not found.')
    }
    return activity
  }

  async getWeeklySummary(userId: string) {
    const user = await this.userRepository.findById(userId)
    if (!user || user.is_deleted) throw new NotFoundException('Hunter not found.')

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const activities = await this.activityRepository.findByUserIdSince(userId, weekAgo)

    // Build a map keyed by ISO date string (YYYY-MM-DD)
    const dayMap = new Map<string, { count: number; xp: number; distance_km: number }>()
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dayMap.set(d.toISOString().slice(0, 10), {
        count: 0,
        xp: 0,
        distance_km: 0,
      })
    }

    for (const a of activities) {
      const key = new Date(a.logged_at).toISOString().slice(0, 10)
      const entry = dayMap.get(key)
      if (entry) {
        entry.count += 1
        entry.xp += a.xp_gained
        entry.distance_km = parseFloat((entry.distance_km + a.distancia_m / 1000).toFixed(2))
      }
    }

    return {
      hunter_id: userId,
      days: Array.from(dayMap.entries()).map(([date, v]) => ({ date, ...v })),
    }
  }

  async getStreaks(userId: string) {
    const user = await this.userRepository.findById(userId)
    if (!user || user.is_deleted) throw new NotFoundException('Hunter not found.')

    const activities = await this.activityRepository.findAllByUserId(userId)
    if (activities.length === 0) {
      return { hunter_id: userId, current_streak: 0, best_streak: 0 }
    }

    // Collect unique activity days (UTC date strings)
    const activeDays = new Set(
      activities.map((a) => new Date(a.logged_at).toISOString().slice(0, 10)),
    )
    const sortedDays = [...activeDays].sort()

    let currentStreak = 0
    let bestStreak = 0
    let streak = 1

    for (let i = 1; i < sortedDays.length; i++) {
      const prev = new Date(sortedDays[i - 1])
      const curr = new Date(sortedDays[i])
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000)
      if (diffDays === 1) {
        streak += 1
      } else {
        bestStreak = Math.max(bestStreak, streak)
        streak = 1
      }
    }
    bestStreak = Math.max(bestStreak, streak)

    // Check if streak is still active (last active day is today or yesterday)
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const lastDay = sortedDays[sortedDays.length - 1]
    currentStreak = lastDay === today || lastDay === yesterday ? streak : 0

    return {
      hunter_id: userId,
      current_streak: currentStreak,
      best_streak: bestStreak,
    }
  }

  async updateActivity(id: string, userId: string, dto: UpdateActivityDto) {
    const activity = await this.activityRepository.findById(id)
    if (!activity || activity.user_id !== userId) {
      throw new NotFoundException('Activity not found.')
    }

    const updatedData: any = {}
    if (dto.distancia_m !== undefined) updatedData.distancia_m = dto.distancia_m
    if (dto.duracao_seg !== undefined) updatedData.duracao_seg = dto.duracao_seg
    if (dto.tipo_exercicio !== undefined) updatedData.tipo_exercicio = dto.tipo_exercicio
    if (dto.coordenadas_gps !== undefined) updatedData.coordenadas_gps = dto.coordenadas_gps
    if (dto.bpm_medio !== undefined) updatedData.bpm_medio = dto.bpm_medio

    // If distance or duration changed, recalculate XP based on new values
    if (
      (dto.distancia_m !== undefined || dto.duracao_seg !== undefined) &&
      dto.distancia_m &&
      dto.duracao_seg
    ) {
      const speedKmh = dto.distancia_m / 1000 / (dto.duracao_seg / 3600)
      if (speedKmh > MAX_SPEED_KMH) {
        throw new BadRequestException(
          `Impossible speed detected (${speedKmh.toFixed(1)} km/h). Activity rejected.`,
        )
      }

      const user = await this.userRepository.findById(userId)
      if (!user || user.is_deleted) throw new NotFoundException('Hunter not found.')

      const multiplier = RANK_XP_MULTIPLIERS[user.rank_level]
      const new_xp = Math.round(XP_BASE_PER_ACTIVITY * multiplier)
      const new_coins = Math.round(COINS_BASE_PER_ACTIVITY * multiplier)

      const xpDiff = new_xp - activity.xp_gained
      const coinsDiff = new_coins - activity.coins_gained

      updatedData.xp_gained = new_xp
      updatedData.coins_gained = new_coins

      await this.userRepository.update(userId, {
        xp: user.xp + xpDiff,
        coins: user.coins + coinsDiff,
      })
    }

    const updated = await this.activityRepository.update(id, updatedData)

    // Invalidate caches
    await this.redisService.del(`hunter:profile:${userId}`)
    await this.redisService.invalidatePattern('leaderboard:*')

    return updated
  }

  async deleteActivity(id: string, userId: string) {
    const activity = await this.activityRepository.findById(id)
    if (!activity || activity.user_id !== userId) {
      throw new NotFoundException('Activity not found.')
    }

    const user = await this.userRepository.findById(userId)
    if (!user || user.is_deleted) throw new NotFoundException('Hunter not found.')

    // Reverse the XP and coins gained from this activity
    const newXp = Math.max(0, user.xp - activity.xp_gained)
    const newCoins = Math.max(0, user.coins - activity.coins_gained)

    await this.userRepository.update(userId, { xp: newXp, coins: newCoins })
    await this.activityRepository.delete(id)

    // Invalidate caches
    await this.redisService.del(`hunter:profile:${userId}`)
    await this.redisService.invalidatePattern('leaderboard:*')

    return { message: 'Activity deleted successfully.' }
  }
}
