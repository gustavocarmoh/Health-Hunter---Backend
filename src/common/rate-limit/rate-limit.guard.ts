import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import { RedisService } from '../../cache/redis.service.js'
import { RATE_LIMIT_KEY, RATE_LIMIT_SKIP_KEY, RateLimitOptions } from './rate-limit.decorator.js'

const DEFAULT_OPTIONS: RateLimitOptions = { limit: 100, ttl: 60000 }

// Substitui @nestjs/throttler: o pacote faz require('@nestjs/common') internamente,
// o que quebra em runtime sob o NestJS v12 (ESM-only) — ainda não tem versão compatível.
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler()
    const classRef = context.getClass()

    const skip = this.reflector.getAllAndOverride<boolean>(RATE_LIMIT_SKIP_KEY, [handler, classRef])
    if (skip) return true

    const options =
      this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [handler, classRef]) ??
      DEFAULT_OPTIONS

    const request = context.switchToHttp().getRequest<Request>()
    const ttlSeconds = Math.max(1, Math.ceil(options.ttl / 1000))
    const key = `throttle:${classRef.name}:${handler.name}:${request.ip}`

    const count = await this.redisService.increment(key, ttlSeconds)

    if (count > options.limit) {
      throw new HttpException('ThrottlerException: Too Many Requests', HttpStatus.TOO_MANY_REQUESTS)
    }

    return true
  }
}
