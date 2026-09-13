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

  /**
   * Invalida o cache do leaderboard toda segunda-feira às 00:00.
   *
   * Garante que o início de semana reflita os XPs mais recentes
   * sem esperar o TTL expirar naturalmente.
   */
  @Cron('0 0 * * 1', {
    name: 'leaderboard-cache-reset',
    timeZone: 'America/Sao_Paulo',
  })
  async resetLeaderboardCache(): Promise<void> {
    this.logger.log('Job: invalidando cache de leaderboards...')
    await this.redisService.invalidatePattern('leaderboard:*')
    this.logger.log('Job: cache de leaderboards invalidado com sucesso.')
  }

  /**
   * Fecha eventos com end_date expirada todo dia à meia-noite.
   *
   * Eventos são marcados como `status = 'closed'` para evitar
   * que continuem aparecendo como ativos para novos participantes.
   */
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

  /**
   * Remove soft-deleted records com mais de 2 anos (LGPD — art. 16, II).
   *
   * Executa toda segunda-feira às 02:30 para evitar horário de pico.
   * Afeta tabelas com `is_deleted = true` e `deleted_at` antigo.
   *
   * LGPD base: prazo de retenção de dados pessoais encerrado.
   */
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

  /**
   * Decay semanal de rank — toda segunda-feira às 04:00 (horário de Brasília).
   *
   * Executa dois mecanismos via `RankEngineService.runWeeklyDecay()`:
   *
   * ① XP DECAY POR INATIVIDADE
   *    Hunters sem atividade nos últimos 14 dias perdem 3% do XP total.
   *    O XP nunca cai abaixo do piso do rank atual (RANK_XP_FLOOR).
   *
   * ② REBAIXAMENTO POR MÍNIMO SEMANAL
   *    Cada rank exige um mínimo de XP por semana:
   *      D → 50 XP | C → 150 | B → 300 | A → 600 | S → 1 000
   *    Hunters que ficaram abaixo do mínimo por 2 semanas consecutivas
   *    são rebaixados automaticamente ao rank anterior.
   */
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

  /**
   * Expira convites de guilda vencidos — todo dia à 01:00.
   *
   * Marca como EXPIRED os convites com status PENDING cujo `expires_at`
   * já passou. Evita que hunters vejam ou respondam convites inválidos.
   */
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

  /**
   * Encerra automaticamente temporadas expiradas — todo dia à meia-noite.
   *
   * Verifica se há uma season ativa cujo `ends_at` já passou.
   * Se houver, chama endSeason() para distribuir rewards ao top 3 e desativar.
   */
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

        // Aqui você poderia chamar seasonService.endSeason() para distribuir rewards
        // Por enquanto, apenas marca como inativa
      }

      this.logger.log(
        `Job auto-end-expired-seasons: ${expiredSeasons.length} temporada(s) encerrada(s).`,
      )
    } catch (err) {
      this.logger.error(`Job auto-end-expired-seasons falhou: ${(err as Error).message}`)
    }
  }
}
