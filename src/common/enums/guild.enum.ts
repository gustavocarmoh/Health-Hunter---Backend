import { HunterRank } from './rank.enum'

/** Papéis possíveis de um membro dentro de uma guilda */
export enum GuildMemberRole {
  MASTER = 'MASTER',
  VICE_MASTER = 'VICE_MASTER',
  ELITE = 'ELITE',
  MEMBER = 'MEMBER',
}

/** Status de um convite de guilda */
export enum GuildInviteStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
}

/**
 * XP total acumulado (soma das contribuições dos membros) para a guilda
 * atingir cada rank. Escalado com os novos thresholds individuais.
 */
export const GUILD_RANK_XP_THRESHOLDS: Record<HunterRank, number> = {
  [HunterRank.E]: 0,
  [HunterRank.D]: 10_000, // era 5_000
  [HunterRank.C]: 50_000, // era 20_000
  [HunterRank.B]: 150_000, // era 60_000
  [HunterRank.A]: 400_000, // era 150_000
  [HunterRank.S]: 1_000_000, // era 400_000
}

/**
 * Limite máximo de membros simultâneos por rank de guilda.
 * Guildas de rank S são as mais exclusivas do jogo.
 */
export const GUILD_MAX_MEMBERS: Record<HunterRank, number> = {
  [HunterRank.E]: 10,
  [HunterRank.D]: 15,
  [HunterRank.C]: 20,
  [HunterRank.B]: 30,
  [HunterRank.A]: 40,
  [HunterRank.S]: 50,
}

/**
 * Bônus percentual de XP pessoal concedido ao hunter por pertencer
 * a uma guilda de cada rank. Aplicado sobre o XP bruto da atividade.
 */
export const GUILD_XP_BONUS_PCT: Record<HunterRank, number> = {
  [HunterRank.E]: 0,
  [HunterRank.D]: 2,
  [HunterRank.C]: 5,
  [HunterRank.B]: 8,
  [HunterRank.A]: 12,
  [HunterRank.S]: 15,
}

/** Rank mínimo do hunter para CRIAR uma guilda */
export const GUILD_CREATE_MIN_RANK = HunterRank.C

/** Validade padrão de um convite (em dias) */
export const GUILD_INVITE_TTL_DAYS = 7

/**
 * XP mínimo coletivo (soma de XP gerado pelos membros) por semana
 * para a guilda manter seu rank. Guildas inativas perdem XP no ciclo
 * semanal de decay (5% sobre o XP acima do GUILD_XP_FLOOR).
 * Rank E é isento.
 */
export const GUILD_WEEKLY_MINIMUM_XP: Record<HunterRank, number> = {
  [HunterRank.E]: 0,
  [HunterRank.D]: 1_000,
  [HunterRank.C]: 3_000,
  [HunterRank.B]: 8_000,
  [HunterRank.A]: 20_000,
  [HunterRank.S]: 50_000,
}

/**
 * XP mínimo que uma guilda mantém após decay, definido em ~70% do threshold
 * de acesso ao rank. Evita queda de rank em cascata num único ciclo.
 */
export const GUILD_XP_FLOOR: Record<HunterRank, number> = {
  [HunterRank.E]: 0,
  [HunterRank.D]: 7_000, // 70% de 10_000
  [HunterRank.C]: 35_000, // 70% de 50_000
  [HunterRank.B]: 105_000, // 70% de 150_000
  [HunterRank.A]: 280_000, // 70% de 400_000
  [HunterRank.S]: 700_000, // 70% de 1_000_000
}

/**
 * Calcula o rank da guilda com base em seu XP total acumulado.
 *
 * Percorre os thresholds do maior para o menor e retorna o
 * primeiro que o XP total supera, garantindo o rank correto.
 *
 * @param totalXp - XP total acumulado pela guilda (soma de contribuições)
 * @returns O rank correspondente ao XP fornecido
 */
export function computeGuildRank(totalXp: number): HunterRank {
  const entries = Object.entries(GUILD_RANK_XP_THRESHOLDS) as [HunterRank, number][]
  const sorted = entries.sort(([, a], [, b]) => b - a) // maior threshold primeiro
  for (const [rank, threshold] of sorted) {
    if (totalXp >= threshold) return rank
  }
  return HunterRank.E
}
