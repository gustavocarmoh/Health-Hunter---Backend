import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name)
  private client: Redis

  constructor(private readonly configService: ConfigService) {
    const maxRetries = this.configService.get<number>('REDIS_RETRY_ATTEMPTS', 10)

    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
      lazyConnect: true,
      // Desiste após maxRetries tentativas para não travar o bootstrap indefinidamente
      // quando o Redis está inacessível.
      retryStrategy: (times) => (times > maxRetries ? null : Math.min(times * 100, 3000)),
    })

    this.client.on('error', (err: Error) => {
      this.logger.error(`Redis error: ${err.message}`)
    })
  }

  async onModuleInit(): Promise<void> {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost')
    const port = this.configService.get<number>('REDIS_PORT', 6379)
    this.logger.log(`Conectando ao Redis em ${host}:${port}...`)
    try {
      await this.client.connect()
      this.logger.log('Redis connected.')
    } catch (err) {
      this.logger.error(
        `Não foi possível conectar ao Redis em ${host}:${port}: ${(err as Error).message}`,
      )
      throw err
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit()
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key)
      if (!value) return null
      return JSON.parse(value) as T
    } catch (err) {
      this.logger.warn(
        `Redis GET falhou para "${key}": ${(err as Error).message} — continuando sem cache`,
      )
      return null
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds)
    } catch (err) {
      this.logger.warn(`Redis SET falhou para "${key}": ${(err as Error).message}`)
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return
    try {
      await this.client.del(...keys)
    } catch (err) {
      this.logger.warn(`Redis DEL falhou: ${(err as Error).message}`)
    }
  }

  // Usa cursor SCAN em vez de KEYS para não bloquear o loop de eventos em bases grandes.
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      let cursor = '0'
      do {
        const [next, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', '100')
        cursor = next
        if (keys.length > 0) await this.client.del(...keys)
      } while (cursor !== '0')
    } catch (err) {
      this.logger.warn(`Redis SCAN/DEL falhou para pattern "${pattern}": ${(err as Error).message}`)
    }
  }

  async ping(): Promise<void> {
    await this.client.ping()
  }

  // Usado para rate limiting em janela fixa: TTL é setado só na primeira chamada.
  async increment(key: string, ttlSeconds: number): Promise<number> {
    const count = await this.client.incr(key)
    if (count === 1) {
      await this.client.expire(key, ttlSeconds)
    }
    return count
  }
}
