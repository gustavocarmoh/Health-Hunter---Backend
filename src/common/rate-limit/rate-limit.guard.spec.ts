import { jest } from '@jest/globals'
import { ExecutionContext, HttpException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { RateLimitGuard } from './rate-limit.guard.js'
import { RedisService } from '../../cache/redis.service.js'

function buildContext(ip = '127.0.0.1'): ExecutionContext {
  return {
    getHandler: () => ({ name: 'handler' }),
    getClass: () => ({ name: 'Controller' }),
    switchToHttp: () => ({
      getRequest: () => ({ ip }),
    }),
  } as unknown as ExecutionContext
}

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard
  let reflector: { getAllAndOverride: jest.Mock<(...args: unknown[]) => unknown> }
  let redisService: { increment: jest.Mock<(...args: unknown[]) => Promise<number>> }

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() }
    redisService = { increment: jest.fn() }
    guard = new RateLimitGuard(
      reflector as unknown as Reflector,
      redisService as unknown as RedisService,
    )
  })

  it('should skip rate limiting when @SkipThrottle is applied', async () => {
    reflector.getAllAndOverride.mockReturnValueOnce(true)

    await expect(guard.canActivate(buildContext())).resolves.toBe(true)
    expect(redisService.increment).not.toHaveBeenCalled()
  })

  it('should allow the request when under the default limit', async () => {
    reflector.getAllAndOverride.mockReturnValueOnce(undefined).mockReturnValueOnce(undefined)
    redisService.increment.mockResolvedValue(1)

    await expect(guard.canActivate(buildContext())).resolves.toBe(true)
    expect(redisService.increment).toHaveBeenCalledWith(expect.stringContaining('throttle:'), 60)
  })

  it('should use custom limits from @Throttle', async () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce({ limit: 5, ttl: 30000 })
    redisService.increment.mockResolvedValue(1)

    await guard.canActivate(buildContext())

    expect(redisService.increment).toHaveBeenCalledWith(expect.any(String), 30)
  })

  it('should throw 429 when the count exceeds the limit', async () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce({ limit: 5, ttl: 60000 })
    redisService.increment.mockResolvedValue(6)

    await expect(guard.canActivate(buildContext())).rejects.toThrow(HttpException)
  })
})
