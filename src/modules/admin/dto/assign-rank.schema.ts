import { HunterRank } from '../../../common/enums/rank.enum.js'

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
