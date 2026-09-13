import { jest } from '@jest/globals'
import { HealthIndicatorService } from '@nestjs/terminus'
import { RedisHealthIndicator } from './redis-health.indicator.js'
import { RedisService } from '../cache/redis.service.js'

describe('RedisHealthIndicator', () => {
  let indicator: RedisHealthIndicator
  let redisService: { ping: jest.Mock<(...args: unknown[]) => Promise<void>> }

  beforeEach(() => {
    redisService = { ping: jest.fn() }
    indicator = new RedisHealthIndicator(
      redisService as unknown as RedisService,
      new HealthIndicatorService(),
    )
  })

  it('should report up when the Redis ping succeeds', async () => {
    redisService.ping.mockResolvedValue(undefined)

    const result = await indicator.isHealthy('redis')

    expect(result.redis.status).toBe('up')
  })

  it('should report down when the Redis ping fails', async () => {
    redisService.ping.mockRejectedValue(new Error('connection refused'))

    const result = await indicator.isHealthy('redis')

    expect(result.redis.status).toBe('down')
  })
})
