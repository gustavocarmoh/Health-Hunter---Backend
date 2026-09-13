import { Controller, Get } from '@nestjs/common'
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { RedisHealthIndicator } from './redis-health.indicator.js'

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  @ApiOperation({
    summary: 'Health check',
    description: 'Verifica status do banco, Redis e memória.',
  })
  @ApiResponse({ status: 200, description: 'Todos os serviços saudáveis.' })
  @ApiResponse({
    status: 503,
    description: 'Um ou mais serviços com problema.',
  })
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('postgres'),
      () => this.redis.isHealthy('redis'),
      () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024), // 200 MB
    ])
  }
}
