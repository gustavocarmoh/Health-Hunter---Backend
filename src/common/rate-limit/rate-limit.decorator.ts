import { SetMetadata } from '@nestjs/common'

export interface RateLimitOptions {
  limit: number
  /** Duração da janela em milissegundos */
  ttl: number
}

export const RATE_LIMIT_KEY = 'rate_limit'
export const RATE_LIMIT_SKIP_KEY = 'rate_limit_skip'

/**
 * Sobrescreve o rate limit padrão (definido no guard global) para uma rota ou controller.
 *
 * @example
 * @Throttle({ default: { limit: 5, ttl: 60000 } })
 */
export const Throttle = (options: { default: RateLimitOptions }) =>
  SetMetadata(RATE_LIMIT_KEY, options.default)

/**
 * Isenta uma rota ou controller do rate limiting global.
 */
export const SkipThrottle = () => SetMetadata(RATE_LIMIT_SKIP_KEY, true)
