import { SetMetadata } from '@nestjs/common'

export interface RateLimitOptions {
  limit: number
  ttl: number
}

export const RATE_LIMIT_KEY = 'rate_limit'
export const RATE_LIMIT_SKIP_KEY = 'rate_limit_skip'

export const Throttle = (options: { default: RateLimitOptions }) =>
  SetMetadata(RATE_LIMIT_KEY, options.default)

export const SkipThrottle = () => SetMetadata(RATE_LIMIT_SKIP_KEY, true)
