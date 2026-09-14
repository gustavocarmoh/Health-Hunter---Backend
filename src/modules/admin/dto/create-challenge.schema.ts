import { HunterRank } from '../../../common/enums/rank.enum.js'

export const createChallengeSchema = {
  type: 'object',
  required: [
    'title',
    'description',
    'tipo_exercicio',
    'xp_base',
    'coins_base',
    'min_rank_required',
  ],
  additionalProperties: false,
  properties: {
    title: {
      type: 'string',
      minLength: 1,
      maxLength: 150,
      pattern: '^[^<>{}\\[\\];]+$',
    },
    description: {
      type: 'string',
      minLength: 1,
      maxLength: 500,
      pattern: '^[^<>{}\\[\\];]+$',
    },
    tipo_exercicio: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      pattern: '^[^<>{}\\[\\];]+$',
    },
    xp_base: {
      type: 'number',
      minimum: 1,
      maximum: 1_000_000,
    },
    coins_base: {
      type: 'number',
      minimum: 0,
      maximum: 1_000_000,
    },
    min_rank_required: {
      type: 'string',
      enum: Object.values(HunterRank),
    },
    is_active: {
      type: 'boolean',
    },
    start_date: {
      type: 'string',
      format: 'date-time',
      description: 'Data/hora de início do desafio (ISO 8601). Ex: 2025-01-15T00:00:00Z',
    },
    end_date: {
      type: 'string',
      format: 'date-time',
      description:
        'Data/hora de encerramento do desafio (ISO 8601). Deve ser posterior a start_date.',
    },
  },
  if: {
    required: ['start_date', 'end_date'],
  },
  then: {
    // AJV não compara datas nativamente: o schema só garante o formato ISO 8601;
    // a checagem end_date > start_date é feita no AdminService.
    properties: {
      end_date: {
        type: 'string',
        format: 'date-time',
      },
    },
  },
} as const
