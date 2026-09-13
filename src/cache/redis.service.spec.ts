import { jest } from '@jest/globals'

const mockClient = {
  on: jest.fn(),
  connect: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  quit: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  get: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  set: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  del: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  scan: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  ping: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  incr: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  expire: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
}

const RedisMock = jest.fn(() => mockClient)

jest.unstable_mockModule('ioredis', () => ({
  default: RedisMock,
  Redis: RedisMock,
}))

const { RedisService } = await import('./redis.service.js')

function buildConfigService(overrides: Record<string, unknown> = {}) {
  return {
    get: jest.fn((key: string, fallback?: unknown) => overrides[key] ?? fallback),
  }
}

describe('RedisService', () => {
  let service: InstanceType<typeof RedisService>

  beforeEach(() => {
    jest.clearAllMocks()
    service = new RedisService(buildConfigService() as never)
  })

  describe('onModuleInit / onModuleDestroy', () => {
    it('should connect on module init', async () => {
      mockClient.connect.mockResolvedValue(undefined)
      await service.onModuleInit()
      expect(mockClient.connect).toHaveBeenCalledTimes(1)
    })

    it('should propagate connection errors', async () => {
      mockClient.connect.mockRejectedValue(new Error('ECONNREFUSED'))
      await expect(service.onModuleInit()).rejects.toThrow('ECONNREFUSED')
    })

    it('should quit the client on module destroy', async () => {
      mockClient.quit.mockResolvedValue(undefined)
      await service.onModuleDestroy()
      expect(mockClient.quit).toHaveBeenCalledTimes(1)
    })
  })

  describe('get', () => {
    it('should return the deserialized value on a cache hit', async () => {
      mockClient.get.mockResolvedValue(JSON.stringify({ id: 1 }))
      const result = await service.get<{ id: number }>('key')
      expect(result).toEqual({ id: 1 })
    })

    it('should return null on a cache miss', async () => {
      mockClient.get.mockResolvedValue(null)
      const result = await service.get('key')
      expect(result).toBeNull()
    })

    it('should return null and not throw when the client errors', async () => {
      mockClient.get.mockRejectedValue(new Error('down'))
      const result = await service.get('key')
      expect(result).toBeNull()
    })
  })

  describe('set', () => {
    it('should serialize the value and set with TTL', async () => {
      mockClient.set.mockResolvedValue('OK')
      await service.set('key', { a: 1 }, 30)
      expect(mockClient.set).toHaveBeenCalledWith('key', JSON.stringify({ a: 1 }), 'EX', 30)
    })

    it('should swallow errors without throwing', async () => {
      mockClient.set.mockRejectedValue(new Error('down'))
      await expect(service.set('key', 'v', 30)).resolves.toBeUndefined()
    })
  })

  describe('del', () => {
    it('should be a no-op when no keys are given', async () => {
      await service.del()
      expect(mockClient.del).not.toHaveBeenCalled()
    })

    it('should delete the given keys', async () => {
      mockClient.del.mockResolvedValue(1)
      await service.del('a', 'b')
      expect(mockClient.del).toHaveBeenCalledWith('a', 'b')
    })
  })

  describe('invalidatePattern', () => {
    it('should scan and delete all matching keys across pages', async () => {
      mockClient.scan
        .mockResolvedValueOnce(['5', ['leaderboard:global']])
        .mockResolvedValueOnce(['0', ['leaderboard:regional']])
      mockClient.del.mockResolvedValue(1)

      await service.invalidatePattern('leaderboard:*')

      expect(mockClient.scan).toHaveBeenCalledTimes(2)
      expect(mockClient.del).toHaveBeenCalledWith('leaderboard:global')
      expect(mockClient.del).toHaveBeenCalledWith('leaderboard:regional')
    })

    it('should not call del when a page has no keys', async () => {
      mockClient.scan.mockResolvedValueOnce(['0', []])

      await service.invalidatePattern('nothing:*')

      expect(mockClient.del).not.toHaveBeenCalled()
    })
  })

  describe('ping', () => {
    it('should resolve when the client responds', async () => {
      mockClient.ping.mockResolvedValue('PONG')
      await expect(service.ping()).resolves.toBeUndefined()
    })
  })

  describe('increment', () => {
    it('should set a TTL only on the first increment', async () => {
      mockClient.incr.mockResolvedValue(1)
      mockClient.expire.mockResolvedValue(1)

      const count = await service.increment('rl:key', 60)

      expect(count).toBe(1)
      expect(mockClient.expire).toHaveBeenCalledWith('rl:key', 60)
    })

    it('should not reset the TTL on subsequent increments', async () => {
      mockClient.incr.mockResolvedValue(2)

      const count = await service.increment('rl:key', 60)

      expect(count).toBe(2)
      expect(mockClient.expire).not.toHaveBeenCalled()
    })
  })
})
