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
  [HunterRank.D]: 2_000, // era 1_000
  [HunterRank.C]: 12_000, // era 5_000
  [HunterRank.B]: 35_000, // era 15_000
  [HunterRank.A]: 100_000, // era 40_000
  [HunterRank.S]: 300_000, // era 100_000
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

/**
 * Mínimo de XP que um hunter deve acumular por semana para manter seu rank.
 * Falhar em 2 semanas consecutivas → rebaixamento automático.
 * Rank E é isento (rank inicial de graça).
 */
export const RANK_WEEKLY_MINIMUM_XP: Record<HunterRank, number> = {
  [HunterRank.E]: 0,
  [HunterRank.D]: 100, // era 50
  [HunterRank.C]: 300, // era 150
  [HunterRank.B]: 600, // era 300
  [HunterRank.A]: 1_200, // era 600
  [HunterRank.S]: 2_000, // era 1_000
}

/**
 * XP mínimo garantido enquanto o hunter mantiver o rank.
 * O decay por inatividade nunca empurra o XP abaixo deste piso,
 * evitando quedas em cascata num único ciclo semanal.
 * Definido em ~80% do threshold de acesso ao rank.
 */
export const RANK_XP_FLOOR: Record<HunterRank, number> = {
  [HunterRank.E]: 0,
  [HunterRank.D]: 1_600, // ~80% de 2_000
  [HunterRank.C]: 9_600, // ~80% de 12_000
  [HunterRank.B]: 28_000, // ~80% de 35_000
  [HunterRank.A]: 80_000, // ~80% de 100_000
  [HunterRank.S]: 240_000, // ~80% de 300_000
}

/**
 * Fator α da pressão regional.
 * Quanto maior, mais rígido fica o threshold em regiões populosas.
 *
 * effective_threshold = base × (1 + α × log₂(1 + competidores_ativos_na_região))
 *
 * α = 0.7  →  com 3  competidores: +1.4×
 *             com 7  competidores: +2.1×
 *             com 15 competidores: +2.8×
 *             com 31 competidores: +3.5×
 */
export const REGIONAL_PRESSURE_ALPHA = 0.7 // era 0.5
