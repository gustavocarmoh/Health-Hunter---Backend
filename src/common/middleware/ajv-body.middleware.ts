import { Logger } from '@nestjs/common'
import Ajv, { ValidateFunction } from 'ajv'
import addFormats from 'ajv-formats'
import type { Request, Response, NextFunction } from 'express'

/**
 * Instância AJV compartilhada entre todos os middlewares.
 *
 * Configuração de segurança:
 * - `coerceTypes: false` — rejeita coerção de tipo ("123" não vira 123, prevenindo ataques de coerção)
 * - `allErrors: true`    — coleta todos os erros de uma vez (melhor UX)
 * - `strict: false`      — compatibilidade com JSON Schema draft-07
 */
const ajv = new Ajv({
  allErrors: true,
  coerceTypes: false,
  strict: false,
})
addFormats(ajv)

const logger = new Logger('AjvBodyMiddleware')

/**
 * Fábrica de middleware Express que valida o `req.body` contra um JSON Schema AJV
 * **antes** de qualquer processamento NestJS (pipes, guards, interceptors).
 *
 * Isso garante que payloads malformados, com campos extras ou fora dos limites
 * definidos no schema sejam rejeitados no nível HTTP com 400, sem chegar à camada
 * de negócio.
 *
 * @example
 * ```typescript
 * // No módulo NestJS:
 * consumer
 *   .apply(createAjvMiddleware(registerSchema))
 *   .forRoutes({ path: 'auth/register', method: RequestMethod.POST });
 * ```
 *
 * @param schema - JSON Schema (draft-07) que descreve o payload esperado
 * @returns Função de middleware Express `(req, res, next) => void`
 */
export function createAjvMiddleware(
  schema: object,
): (req: Request, res: Response, next: NextFunction) => void {
  const validate: ValidateFunction = ajv.compile(schema)

  return (req: Request, res: Response, next: NextFunction): void => {
    const valid = validate(req.body)

    if (valid) {
      return next()
    }

    const errors = (validate.errors ?? []).map(
      (e) => `${e.instancePath || '/body'}: ${e.message ?? 'valor inválido'}`,
    )

    logger.warn(`Schema validation failed [${req.method} ${req.path}]: ${errors.join(', ')}`)

    res.status(400).json({
      statusCode: 400,
      message: 'Payload inválido — schema validation failed',
      errors,
    })
  }
}
