import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { RedisService } from '../../cache/redis.service.js'
import { RankEngineService } from '../../common/rank/rank-engine.service.js'
import { GuildInviteRepository } from '../../repositories/abstract/guild-invite.repository.js'
import { SeasonRepository } from '../../repositories/abstract/season.repository.js'

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name)

  constructor(
    private readonly redisService: RedisService,
    private readonly rankEngineService: RankEngineService,
    private readonly guildInviteRepository: GuildInviteRepository,
    private readonly seasonRepository: SeasonRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Cron('0 0 * * 1', {
    name: 'leaderboard-cache-reset',
    timeZone: 'America/Sao_Paulo',
  })
  async resetLeaderboardCache(): Promise<void> {
    this.logger.log('Job: invalidando cache de leaderboards...')
    await this.redisService.invalidatePattern('leaderboard:*')
    this.logger.log('Job: cache de leaderboards invalidado com sucesso.')
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'close-expired-events',
    timeZone: 'America/Sao_Paulo',
  })
  async closeExpiredEvents(): Promise<void> {
    this.logger.log('Job: encerrando eventos expirados...')
    try {
      const result = await this.dataSource.query(
        `UPDATE events
         SET    status = 'closed',
                updated_at = NOW()
         WHERE  end_date < NOW()
           AND  status NOT IN ('closed', 'cancelled')
           AND  is_deleted = false`,
      )
      const count = Array.isArray(result) ? (result[1] as number) : 0
      this.logger.log(`Job: ${count} eventos encerrados.`)
    } catch (err) {
      this.logger.error(`Job closeExpiredEvents falhou: ${(err as Error).message}`)
    }
  }

  // Remove soft-deleted hunters com mais de 2 anos — LGPD art. 16, II (prazo de retenção encerrado).
  @Cron('30 2 * * 1', {
    name: 'lgpd-audit-cleanup',
    timeZone: 'America/Sao_Paulo',
  })
  async cleanupAuditLogs(): Promise<void> {
    this.logger.log('Job LGPD: removendo registros expirados de hunters...')
    try {
      const cutoff = new Date()
      cutoff.setFullYear(cutoff.getFullYear() - 2)

      const result = await this.dataSource.query(
        `DELETE FROM hunters
         WHERE  is_deleted = true
           AND  updated_at < $1`,
        [cutoff.toISOString()],
      )
      const count = Array.isArray(result) ? (result[1] as number) : 0
      this.logger.log(`Job LGPD: ${count} registros removidos definitivamente.`)
    } catch (err) {
      this.logger.error(`Job LGPD cleanupAuditLogs falhou: ${(err as Error).message}`)
    }
  }

  @Cron('0 4 * * 1', { name: 'rank-decay', timeZone: 'America/Sao_Paulo' })
  async runRankDecay(): Promise<void> {
    this.logger.log('Job rank-decay: iniciando ciclo de degradação de rank...')
    try {
      const report = await this.rankEngineService.runWeeklyDecay()
      this.logger.log(
        `Job rank-decay concluído — XP decayed: ${report.xp_decayed}, ` +
          `rebaixados: ${report.demoted} (IDs: ${report.demoted_ids.join(', ') || 'nenhum'})`,
      )
    } catch (err) {
      this.logger.error(`Job rank-decay falhou: ${(err as Error).message}`)
    }
  }

  @Cron('0 1 * * *', {
    name: 'expire-guild-invites',
    timeZone: 'America/Sao_Paulo',
  })
  async expireGuildInvites(): Promise<void> {
    this.logger.log('Job expire-guild-invites: expirando convites vencidos...')
    try {
      await this.guildInviteRepository.expireOld()
      this.logger.log('Job expire-guild-invites: concluído.')
    } catch (err) {
      this.logger.error(`Job expire-guild-invites falhou: ${(err as Error).message}`)
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'auto-end-expired-seasons',
    timeZone: 'America/Sao_Paulo',
  })
  async autoEndExpiredSeasons(): Promise<void> {
    this.logger.log('Job auto-end-expired-seasons: verificando temporadas expiradas...')
    try {
      const expiredSeasons = await this.dataSource.query(
        `SELECT id, title FROM seasons
         WHERE is_active = true
           AND ends_at < NOW()`,
      )

      for (const season of expiredSeasons) {
        this.logger.log(`Encerrando temporada expirada: ${season.title}`)
        await this.dataSource.query(`UPDATE seasons SET is_active = false WHERE id = $1`, [
          season.id,
        ])
      }

      this.logger.log(
        `Job auto-end-expired-seasons: ${expiredSeasons.length} temporada(s) encerrada(s).`,
      )
    } catch (err) {
      this.logger.error(`Job auto-end-expired-seasons falhou: ${(err as Error).message}`)
    }
  }

  // Retenção LGPD de 90 dias (RELATORIO-ENTREGA.md, Parte 2.4): activity_logs mantém
  // distância/duração/XP (não sensíveis) e só zera GPS/BPM; body_measurements é
  // removido por inteiro pois o registro todo é dado sensível.
  @Cron('0 3 * * *', { name: 'lgpd-purge-sensitive-data', timeZone: 'America/Sao_Paulo' })
  async purgeSensitiveActivityData(): Promise<void> {
    this.logger.log('Job LGPD: expurgando dados sensíveis com mais de 90 dias de retenção...')
    try {
      const activityResult = await this.dataSource.query(
        `UPDATE activity_logs
         SET    coordenadas_gps = NULL,
                bpm_medio = NULL
         WHERE  logged_at < NOW() - INTERVAL '90 days'
           AND  (coordenadas_gps IS NOT NULL OR bpm_medio IS NOT NULL)`,
      )
      const activityCount = Array.isArray(activityResult) ? (activityResult[1] as number) : 0

      const measurementResult = await this.dataSource.query(
        `DELETE FROM body_measurements
         WHERE measured_at < NOW() - INTERVAL '90 days'`,
      )
      const measurementCount = Array.isArray(measurementResult)
        ? (measurementResult[1] as number)
        : 0

      this.logger.log(
        `Job LGPD: GPS/BPM expurgados de ${activityCount} atividade(s); ` +
          `${measurementCount} medida(s) corporal(is) removida(s) (retenção de 90 dias).`,
      )
    } catch (err) {
      this.logger.error(`Job lgpd-purge-sensitive-data falhou: ${(err as Error).message}`)
    }
  }
}
