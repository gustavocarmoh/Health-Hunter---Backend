import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { ActivityCompletedPayload } from '../events/activity-completed.event'

interface NormalizedActivityPayload {
  activity_id: string
  hunter_id: string
  hunter_rank: string
  distancia_m: number
  duracao_seg: number
  tipo_exercicio: string
  bpm_medio: number
  xp_gained: number
  coins_gained: number
  logged_at: string // ISO 8601
  avg_speed_kmh: number
}

@Injectable()
export class ActivityTelemetryListener {
  private readonly logger = new Logger(ActivityTelemetryListener.name)

  @OnEvent('activity.completed', { async: true })
  async handleActivityCompleted(payload: ActivityCompletedPayload): Promise<void> {
    const normalized = this.normalize(payload)
    // In production this would be forwarded to an AI pipeline / message broker
    this.logger.log(
      `[TELEMETRY] activity.completed | hunter=${normalized.hunter_id} | xp=${normalized.xp_gained} | rank=${normalized.hunter_rank}`,
    )
  }

  private normalize(payload: ActivityCompletedPayload): NormalizedActivityPayload {
    const { activity, hunter_id, hunter_rank } = payload
    const avg_speed_kmh =
      activity.duracao_seg > 0
        ? parseFloat(((activity.distancia_m / 1000 / activity.duracao_seg) * 3600).toFixed(2))
        : 0

    return {
      activity_id: activity.id,
      hunter_id,
      hunter_rank,
      distancia_m: parseFloat(activity.distancia_m.toFixed(2)),
      duracao_seg: Math.round(activity.duracao_seg),
      tipo_exercicio: activity.tipo_exercicio.trim().toLowerCase(),
      bpm_medio: Math.round(activity.bpm_medio),
      xp_gained: Math.round(activity.xp_gained),
      coins_gained: Math.round(activity.coins_gained),
      logged_at: activity.logged_at.toISOString(),
      avg_speed_kmh,
    }
  }
}
