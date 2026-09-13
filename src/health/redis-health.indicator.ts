import { Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { RedisService } from '../cache/redis.service.js'

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly redisService: RedisService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  isHealthy(key: string) {
    return this.healthIndicatorService.check(key).attempt(async () => {
      await this.redisService.ping()
    })
  }
}
