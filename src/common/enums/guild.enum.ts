import { HunterRank } from './rank.enum.js'

export enum GuildMemberRole {
  MASTER = 'MASTER',
  VICE_MASTER = 'VICE_MASTER',
  ELITE = 'ELITE',
  MEMBER = 'MEMBER',
}

export enum GuildInviteStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
}

// XP total acumulado (soma das contribuições dos membros) para a guilda atingir cada rank.
export const GUILD_RANK_XP_THRESHOLDS: Record<HunterRank, number> = {
  [HunterRank.E]: 0,
  [HunterRank.D]: 10_000,
  [HunterRank.C]: 50_000,
  [HunterRank.B]: 150_000,
  [HunterRank.A]: 400_000,
  [HunterRank.S]: 1_000_000,
}

export const GUILD_MAX_MEMBERS: Record<HunterRank, number> = {
  [HunterRank.E]: 10,
  [HunterRank.D]: 15,
  [HunterRank.C]: 20,
  [HunterRank.B]: 30,
  [HunterRank.A]: 40,
  [HunterRank.S]: 50,
}

// Bônus percentual aplicado sobre o XP bruto de atividade do hunter, por pertencer a uma guilda daquele rank.
export const GUILD_XP_BONUS_PCT: Record<HunterRank, number> = {
  [HunterRank.E]: 0,
  [HunterRank.D]: 2,
  [HunterRank.C]: 5,
  [HunterRank.B]: 8,
  [HunterRank.A]: 12,
  [HunterRank.S]: 15,
}

export const GUILD_CREATE_MIN_RANK = HunterRank.C

export const GUILD_INVITE_TTL_DAYS = 7

// XP coletivo mínimo por semana para a guilda manter seu rank; abaixo disso, decai
// 5% sobre o XP acima do GUILD_XP_FLOOR no ciclo semanal. Rank E é isento.
export const GUILD_WEEKLY_MINIMUM_XP: Record<HunterRank, number> = {
  [HunterRank.E]: 0,
  [HunterRank.D]: 1_000,
  [HunterRank.C]: 3_000,
  [HunterRank.B]: 8_000,
  [HunterRank.A]: 20_000,
  [HunterRank.S]: 50_000,
}

// Piso de XP após decay, fixado em ~70% do threshold do rank, para evitar queda em cascata num único ciclo.
export const GUILD_XP_FLOOR: Record<HunterRank, number> = {
  [HunterRank.E]: 0,
  [HunterRank.D]: 7_000,
  [HunterRank.C]: 35_000,
  [HunterRank.B]: 105_000,
  [HunterRank.A]: 280_000,
  [HunterRank.S]: 700_000,
}

export function computeGuildRank(totalXp: number): HunterRank {
  const entries = Object.entries(GUILD_RANK_XP_THRESHOLDS) as [HunterRank, number][]
  const sorted = entries.sort(([, a], [, b]) => b - a)
  for (const [rank, threshold] of sorted) {
    if (totalXp >= threshold) return rank
  }
  return HunterRank.E
}
