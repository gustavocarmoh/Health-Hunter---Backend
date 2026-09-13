import { Injectable, Logger } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { UserRepository } from '../../repositories/abstract/user.repository.js'
import {
  HunterRank,
  RANK_ORDER,
  RANK_XP_THRESHOLDS,
  RANK_WEEKLY_MINIMUM_XP,
  RANK_XP_FLOOR,
  REGIONAL_PRESSURE_ALPHA,
} from '../enums/rank.enum.js'
import { IUser } from '../interfaces/user.interface.js'

export interface DecayReport {
  /** Hunters que perderam XP por inatividade */
  xp_decayed: number
  /** Hunters rebaixados por mínimo semanal não cumprido */
  demoted: number
  demoted_ids: string[]
}

export interface EffectiveThresholdInfo {
  base_threshold: number
  effective_threshold: number
  regional_competitors: number
  pressure_multiplier: number
}

@Injectable()
export class RankEngineService {
  private readonly logger = new Logger(RankEngineService.name)

  constructor(
    private readonly userRepository: UserRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * Calcula o threshold efetivo de XP para avançar ao `nextRank`.
   *
   * Aplica o fator de pressão regional: quanto mais hunters ativos na mesma
   * região já estão naquele rank (ou acima), mais alto é o threshold.
   *
   * effective_threshold = base × (1 + α × log₂(1 + competidores_ativos))
   *
   * Hunters são considerados "ativos" se registraram ao menos 1 atividade
   * nos últimos 30 dias.
   */
  async getEffectiveThreshold(user: IUser, nextRank: HunterRank): Promise<EffectiveThresholdInfo> {
    const base = RANK_XP_THRESHOLDS[nextRank]

    // Ranks que contam como "competição" = nextRank e acima
    const nextRankIndex = RANK_ORDER.indexOf(nextRank)
    const ranksAtOrAbove = RANK_ORDER.slice(nextRankIndex)

    const rows: { count: string }[] = await this.dataSource.query(
      `SELECT COUNT(DISTINCT u.id) AS count
       FROM   users u
       WHERE  u.region_state = $1
         AND  u.rank_level   = ANY($2::text[])
         AND  u.is_deleted   = false
         AND  u.id           != $3
         AND  EXISTS (
                SELECT 1
                FROM   activity_logs al
                WHERE  al.user_id   = u.id
                  AND  al.logged_at >= NOW() - INTERVAL '30 days'
              )`,
      [user.region_state, ranksAtOrAbove, user.id],
    )

    const regional_competitors = parseInt(rows[0]?.count ?? '0', 10)
    const pressure_multiplier = 1 + REGIONAL_PRESSURE_ALPHA * Math.log2(1 + regional_competitors)
    const effective_threshold = Math.ceil(base * pressure_multiplier)

    return {
      base_threshold: base,
      effective_threshold,
      regional_competitors,
      pressure_multiplier,
    }
  }

  /**
   * Verifica e aplica promoção de rank após um ganho de XP.
   *
   * Usa o threshold dinâmico (pressão regional) em vez do threshold fixo.
   * O evento `hunter.rank_up` agora inclui `regional_threshold` para que
   * o cliente possa exibir a dificuldade que foi superada.
   */
  async checkPromotion(user: IUser, newXp: number, eventEmitter: EventEmitter2): Promise<void> {
    const currentIndex = RANK_ORDER.indexOf(user.rank_level)
    if (currentIndex === RANK_ORDER.length - 1) return // Rank S, topo absoluto

    const nextRank = RANK_ORDER[currentIndex + 1]
    const info = await this.getEffectiveThreshold(user, nextRank)

    if (newXp >= info.effective_threshold) {
      await this.userRepository.update(user.id, { rank_level: nextRank })
      eventEmitter.emit('hunter.rank_up', {
        hunter_id: user.id,
        old_rank: user.rank_level,
        new_rank: nextRank,
        total_xp: newXp,
        regional_threshold: info.effective_threshold,
        regional_competitors: info.regional_competitors,
        pressure_multiplier: parseFloat(info.pressure_multiplier.toFixed(2)),
      })

      this.logger.log(
        `Hunter ${user.id} promovido ${user.rank_level}→${nextRank} ` +
          `(threshold ${info.effective_threshold} com ${info.regional_competitors} competidores regionais)`,
      )
    }
  }

  /**
   * Job semanal de degradação de rank — dois mecanismos independentes:
   *
   * ① XP DECAY POR INATIVIDADE
   *    Hunters sem atividade nos últimos 7 dias perdem 5% do XP.
   *    O XP não cai abaixo do RANK_XP_FLOOR do rank atual.
   *
   * ② REBAIXAMENTO POR MÍNIMO SEMANAL
   *    Cada rank exige um mínimo de XP acumulado por semana.
   *    Hunters que ficaram abaixo do mínimo por 2 semanas seguidas são
   *    rebaixados ao rank anterior e têm o XP ajustado para logo abaixo
   *    do threshold de subida (para que precisem re-ganhar para voltar).
   *
   * Retorna um relatório para log/auditoria.
   */
  async runWeeklyDecay(): Promise<DecayReport> {
    const report: DecayReport = { xp_decayed: 0, demoted: 0, demoted_ids: [] }

    // ── ① Decay de XP por inatividade ─────────────────────────────────────
    const inactiveUsers: { id: string; xp: number; rank_level: HunterRank }[] = await this
      .dataSource.query(`
        SELECT id, xp, rank_level
        FROM   users
        WHERE  rank_level != 'E'
          AND  is_deleted  = false
          AND  NOT EXISTS (
                 SELECT 1
                 FROM   activity_logs al
                 WHERE  al.user_id   = users.id
                   AND  al.logged_at >= NOW() - INTERVAL '7 days'
               )
      `)

    for (const u of inactiveUsers) {
      const floor = RANK_XP_FLOOR[u.rank_level]
      const decayed = Math.max(floor, Math.floor(u.xp * 0.95)) // 5% decay (era 3%)
      if (decayed < u.xp) {
        await this.userRepository.update(u.id, { xp: decayed })
        report.xp_decayed++
      }
    }

    // ── ② Rebaixamento por mínimo semanal (2 semanas seguidas) ────────────
    for (const rank of RANK_ORDER.slice(1)) {
      const minXp = RANK_WEEKLY_MINIMUM_XP[rank]
      if (minXp === 0) continue

      /*
       * Para cada hunter neste rank, calcula:
       *   week1 = XP nos últimos 7 dias
       *   week2 = XP entre 8 e 14 dias atrás
       * Se ambos < mínimo → rebaixa.
       */
      const candidates: {
        id: string
        xp: number
        week1: string
        week2: string
      }[] = await this.dataSource.query(
        `
        SELECT u.id,
               u.xp,
               COALESCE(w1.total, 0)::text AS week1,
               COALESCE(w2.total, 0)::text AS week2
        FROM   users u
        LEFT   JOIN (
                 SELECT user_id, SUM(xp_gained) AS total
                 FROM   activity_logs
                 WHERE  logged_at >= NOW() - INTERVAL '7 days'
                 GROUP  BY user_id
               ) w1 ON w1.user_id = u.id
        LEFT   JOIN (
                 SELECT user_id, SUM(xp_gained) AS total
                 FROM   activity_logs
                 WHERE  logged_at BETWEEN NOW() - INTERVAL '14 days'
                                     AND NOW() - INTERVAL '7 days'
                 GROUP  BY user_id
               ) w2 ON w2.user_id = u.id
        WHERE  u.rank_level = $1
          AND  u.is_deleted = false
        `,
        [rank],
      )

      const currentIndex = RANK_ORDER.indexOf(rank)
      const prevRank = RANK_ORDER[currentIndex - 1] // sempre existe (pulamos E)

      for (const row of candidates) {
        const week1Xp = parseInt(row.week1, 10)
        const week2Xp = parseInt(row.week2, 10)

        if (week1Xp < minXp && week2Xp < minXp) {
          // XP cai para logo abaixo do threshold de subida (precisa re-ganhar para voltar)
          const newXp = Math.max(RANK_XP_FLOOR[prevRank], RANK_XP_THRESHOLDS[rank] - 1)

          await this.userRepository.update(row.id, {
            rank_level: prevRank,
            xp: Math.min(row.xp, newXp),
          })

          report.demoted++
          report.demoted_ids.push(row.id)

          this.logger.warn(
            `Hunter ${row.id} rebaixado ${rank}→${prevRank} ` +
              `(week1=${week1Xp} week2=${week2Xp} min=${minXp})`,
          )
        }
      }
    }

    return report
  }
}
