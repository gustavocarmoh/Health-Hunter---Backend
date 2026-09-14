// maxLength 2048 cobre JWTs realistas (header.payload.signature) e rejeita payloads artificialmente grandes.
export const refreshTokenSchema = {
  type: 'object',
  required: ['refresh_token'],
  additionalProperties: false,
  properties: {
    refresh_token: {
      type: 'string',
      minLength: 20,
      maxLength: 2048,
    },
  },
} as const
