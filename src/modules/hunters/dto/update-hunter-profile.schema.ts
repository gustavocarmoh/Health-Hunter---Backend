import { LifestyleType } from '../../../common/enums/lifestyle.enum.js'

export const updateHunterProfileSchema = {
  type: 'object',
  additionalProperties: false,
  minProperties: 1,
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      pattern: '^[^<>{}\\[\\];]+$',
    },
    lifestyle: {
      type: 'string',
      enum: Object.values(LifestyleType),
    },
    region_state: {
      type: 'string',
      maxLength: 100,
      pattern: '^[^<>{}\\[\\];]*$',
    },
    region_country: {
      type: 'string',
      maxLength: 100,
      pattern: '^[^<>{}\\[\\];]*$',
    },
    city: {
      type: 'string',
      maxLength: 100,
      pattern: '^[^<>{}\\[\\];]*$',
    },
  },
} as const
