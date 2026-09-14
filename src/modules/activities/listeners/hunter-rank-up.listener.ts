import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'

export interface HunterRankUpPayload {
  hunter_id: string
  old_rank: string
  new_rank: string
  total_xp: number
}

@Injectable()
export class HunterRankUpListener {
  private readonly logger = new Logger(HunterRankUpListener.name)

  @OnEvent('hunter.rank_up', { async: true })
  async handleRankUp(payload: HunterRankUpPayload): Promise<void> {
    this.logger.log(
      `[RANK UP] Hunter ${payload.hunter_id} advanced from ${payload.old_rank} to ${payload.new_rank} (Total XP: ${payload.total_xp})`,
    )
  }
}
