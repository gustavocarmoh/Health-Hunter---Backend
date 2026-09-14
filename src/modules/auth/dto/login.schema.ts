export const loginSchema = {
  type: 'object',
  required: ['email', 'password'],
  additionalProperties: false,
  properties: {
    email: {
      type: 'string',
      format: 'email',
      maxLength: 254,
    },
    password: {
      type: 'string',
      minLength: 1,
      // SEGURANÇA CRÍTICA: bcrypt trava na CPU para strings longas.
      // Rejeitar antes de chegar ao serviço de autenticação.
      maxLength: 72,
    },
  },
} as const
