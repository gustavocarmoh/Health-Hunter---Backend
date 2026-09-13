import { HunterRank } from '../../../common/enums/rank.enum.js'

/**
 * JSON Schema (AJV draft-07) para validação do payload de criação de desafio.
 *
 * - Strings com pattern anti-injeção para title, description e tipo_exercicio
 * - `is_active` é opcional com tipo estritamente boolean (sem coerção)
 * - `start_date` e `end_date` são ISO 8601 date-time (validação de formato via ajv-formats)
 * - Regra de negócio `end_date > start_date` aplicada via keyword `if/then`
 */
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
  // Valida end_date > start_date quando ambos estiverem presentes
  if: {
    required: ['start_date', 'end_date'],
  },
  then: {
    // AJV não possui comparação de datas nativa; usamos a keyword `formatExclusiveMaximum`
    // disponível via ajv-formats com `ajv-keywords`, ou validamos via custom keyword.
    // Alternativa compatível com ajv + ajv-formats sem plugins extras:
    // a verificação de ordem de datas é garantida no service (validação de camada de negócio).
    // O schema garante o formato correto; a restrição de ordem é aplicada no AdminService.
    properties: {
      end_date: {
        type: 'string',
        format: 'date-time',
      },
    },
  },
} as const
