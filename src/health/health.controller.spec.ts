import { jest } from '@jest/globals'
import { HealthController } from './health.controller.js'
import { HealthCheckService, TypeOrmHealthIndicator, MemoryHealthIndicator } from '@nestjs/terminus'
import { RedisHealthIndicator } from './redis-health.indicator.js'

describe('HealthController', () => {
  let controller: HealthController
  let health: {
    check: jest.Mock<(checks: Array<() => unknown>) => Promise<unknown>>
  }
  let db: { pingCheck: jest.Mock<(...args: unknown[]) => unknown> }
  let memory: { checkHeap: jest.Mock<(...args: unknown[]) => unknown> }
  let redis: { isHealthy: jest.Mock<(...args: unknown[]) => unknown> }

  beforeEach(() => {
    health = { check: jest.fn() }
    db = { pingCheck: jest.fn() }
    memory = { checkHeap: jest.fn() }
    redis = { isHealthy: jest.fn() }

    controller = new HealthController(
      health as unknown as HealthCheckService,
      db as unknown as TypeOrmHealthIndicator,
      memory as unknown as MemoryHealthIndicator,
      redis as unknown as RedisHealthIndicator,
    )
  })

  it('should run the postgres, redis and memory checks', async () => {
    health.check.mockImplementation(async (checks: Array<() => unknown>) => {
      return Promise.all(checks.map((fn) => fn()))
    })
    db.pingCheck.mockReturnValue({ postgres: { status: 'up' } })
    redis.isHealthy.mockReturnValue({ redis: { status: 'up' } })
    memory.checkHeap.mockReturnValue({ memory_heap: { status: 'up' } })

    await controller.check()

    expect(db.pingCheck).toHaveBeenCalledWith('postgres')
    expect(redis.isHealthy).toHaveBeenCalledWith('redis')
    expect(memory.checkHeap).toHaveBeenCalledWith('memory_heap', 200 * 1024 * 1024)
    expect(health.check).toHaveBeenCalledTimes(1)
  })
})
