/**
 * JSON Schema (AJV draft-07) para validação do payload de login.
 *
 * Limite de `maxLength` em password bloqueia payloads absurdamente grandes
 * usados em ataques de DoS via bcrypt (bcrypt é O(2^cost) — strings longas
 * aumentam drasticamente o tempo de hash).
 */
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
