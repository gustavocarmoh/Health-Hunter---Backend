import { Role } from '../../../common/enums/role.enum'

/**
 * JSON Schema (AJV draft-07) para validação do payload de atribuição de Role.
 *
 * O enum de valores é importado do código-fonte para garantir sincronia automática.
 */
export const assignRoleSchema = {
  type: 'object',
  required: ['role'],
  additionalProperties: false,
  properties: {
    role: {
      type: 'string',
      enum: Object.values(Role),
    },
  },
} as const
