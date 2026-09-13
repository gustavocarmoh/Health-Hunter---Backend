import { HunterRank } from '../../../common/enums/rank.enum.js'

/**
 * JSON Schema (AJV draft-07) para validação do payload de atribuição de Rank.
 *
 * O enum de valores é importado do código-fonte para garantir sincronia automática.
 */
export const assignRankSchema = {
  type: 'object',
  required: ['rank_level'],
  additionalProperties: false,
  properties: {
    rank_level: {
      type: 'string',
      enum: Object.values(HunterRank),
    },
  },
} as const
