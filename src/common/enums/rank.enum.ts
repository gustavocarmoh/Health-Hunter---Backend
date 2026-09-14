export enum HunterRank {
  E = 'E',
  D = 'D',
  C = 'C',
  B = 'B',
  A = 'A',
  S = 'S',
}

export const RANK_XP_THRESHOLDS: Record<HunterRank, number> = {
  [HunterRank.E]: 0,
  [HunterRank.D]: 2_000,
  [HunterRank.C]: 12_000,
  [HunterRank.B]: 35_000,
  [HunterRank.A]: 100_000,
  [HunterRank.S]: 300_000,
}

export const RANK_XP_MULTIPLIERS: Record<HunterRank, number> = {
  [HunterRank.E]: 1.0,
  [HunterRank.D]: 1.5,
  [HunterRank.C]: 2.0,
  [HunterRank.B]: 2.5,
  [HunterRank.A]: 3.5,
  [HunterRank.S]: 5.0,
}

export const RANK_ORDER: HunterRank[] = [
  HunterRank.E,
  HunterRank.D,
  HunterRank.C,
  HunterRank.B,
  HunterRank.A,
  HunterRank.S,
]

// Mínimo de XP semanal para manter o rank; falhar 2 semanas seguidas rebaixa
// automaticamente. Rank E é isento (rank inicial de graça).
export const RANK_WEEKLY_MINIMUM_XP: Record<HunterRank, number> = {
  [HunterRank.E]: 0,
  [HunterRank.D]: 100,
  [HunterRank.C]: 300,
  [HunterRank.B]: 600,
  [HunterRank.A]: 1_200,
  [HunterRank.S]: 2_000,
}

// Piso de XP (~80% do threshold do rank) que o decay por inatividade nunca ultrapassa,
// evitando quedas em cascata num único ciclo semanal.
export const RANK_XP_FLOOR: Record<HunterRank, number> = {
  [HunterRank.E]: 0,
  [HunterRank.D]: 1_600,
  [HunterRank.C]: 9_600,
  [HunterRank.B]: 28_000,
  [HunterRank.A]: 80_000,
  [HunterRank.S]: 240_000,
}

// Fator α da pressão regional: effective_threshold = base × (1 + α × log₂(1 + competidores_ativos)).
// Com α = 0.7: 3 competidores → +1.4×, 7 → +2.1×, 15 → +2.8×, 31 → +3.5×.
export const REGIONAL_PRESSURE_ALPHA = 0.7
