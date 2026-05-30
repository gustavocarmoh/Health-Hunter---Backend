import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { SENSITIVE_FIELDS_KEY } from '../decorators/sensitive-fields.decorator'

@Injectable()
export class SensitiveDataMaskInterceptor implements NestInterceptor {
  private readonly defaultSensitiveFields = [
    'coordenadas_gps',
    'bpm_medio',
    'password',
    'password_hash',
  ]

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const extraFields =
      this.reflector.getAllAndOverride<string[]>(SENSITIVE_FIELDS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? []

    const sensitiveFields = [...new Set([...this.defaultSensitiveFields, ...extraFields])]

    const request = context.switchToHttp().getRequest<Record<string, unknown>>()
    const safeBody = this.maskObject(request['body'] as Record<string, unknown>, sensitiveFields)

    if (Object.keys(safeBody).length > 0) {
      const method = request['method']
      const url = (request as { url?: string }).url ?? ''
      // Only log non-sensitive representation of the request body
      console.log(`[REQUEST] ${method} ${url}`, JSON.stringify(safeBody))
    }

    return next.handle().pipe(
      tap(() => {
        // Post-processing hook (extend if needed)
      }),
    )
  }

  private maskObject(obj: Record<string, unknown>, fields: string[]): Record<string, unknown> {
    if (!obj || typeof obj !== 'object') return {}
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      if (fields.includes(key)) {
        result[key] = typeof value === 'object' ? '[HIDDEN]' : '***'
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.maskObject(value as Record<string, unknown>, fields)
      } else {
        result[key] = value
      }
    }
    return result
  }
}
