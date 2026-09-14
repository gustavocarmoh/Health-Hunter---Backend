import { Logger } from '@nestjs/common'
import Ajv, { ValidateFunction } from 'ajv'
import addFormats from 'ajv-formats'
import type { Request, Response, NextFunction } from 'express'

// coerceTypes: false por segurança — rejeita coerção de tipo ("123" não vira 123).
const ajv = new Ajv({
  allErrors: true,
  coerceTypes: false,
  strict: false,
})
addFormats(ajv)

const logger = new Logger('AjvBodyMiddleware')

// Middleware Express que valida req.body contra um JSON Schema AJV antes de
// qualquer processamento NestJS (pipes, guards, interceptors), rejeitando
// payloads malformados direto no nível HTTP.
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
