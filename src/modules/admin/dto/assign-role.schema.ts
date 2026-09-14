import { Role } from '../../../common/enums/role.enum.js'

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
