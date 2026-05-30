/**
 * JSON Schema (AJV draft-07) para validação do payload de registro.
 *
 * Defesa em profundidade aplicada antes da camada NestJS:
 * - `additionalProperties: false` — rejeita campos desconhecidos
 * - `maxLength` restritivo — previne DoS via strings gigantes
 * - `format: email` — rejeita e-mails malformados no nível HTTP
 * - password sem padrão regex — senhas devem aceitar qualquer caractere
 */
export const registerSchema = {
  type: 'object',
  required: ['email', 'password', 'name'],
  additionalProperties: false,
  properties: {
    email: {
      type: 'string',
      format: 'email',
      maxLength: 254, // RFC 5321 limite de endereço
    },
    password: {
      type: 'string',
      minLength: 8,
      maxLength: 64,
    },
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      // Bloqueia caracteres de injeção HTML/XML comuns
      pattern: '^[^<>{}\\[\\];]+$',
    },
  },
} as const
