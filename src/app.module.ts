import { Logger, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { LoggerModule } from 'nestjs-pino'
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { RateLimitGuard } from './common/rate-limit/rate-limit.guard.js'
import { randomUUID } from 'crypto'
import { IncomingMessage, ServerResponse } from 'http'
import { AuthModule } from './modules/auth/auth.module.js'
import { HuntersModule } from './modules/hunters/hunters.module.js'
import { ActivitiesModule } from './modules/activities/activities.module.js'
import { EventsModule } from './modules/events/events.module.js'
import { LeaderboardsModule } from './modules/leaderboards/leaderboards.module.js'
import { AdminModule } from './modules/admin/admin.module.js'
import { SeasonsModule } from './modules/seasons/seasons.module.js'
import { StoreModule } from './modules/store/store.module.js'
import { RankModule } from './common/rank/rank.module.js'
import { GuildsModule } from './modules/guilds/guilds.module.js'
import { ChallengesModule } from './modules/challenges/challenges.module.js'
import { NotificationsModule } from './modules/notifications/notifications.module.js'
import { AchievementsModule } from './modules/achievements/achievements.module.js'
import { AiModule } from './modules/ai/ai.module.js'
import { MissionsModule } from './modules/missions/missions.module.js'
import { RepositoriesModule } from './repositories/repositories.module.js'
import { RedisCacheModule } from './cache/redis-cache.module.js'
import { HealthModule } from './health/health.module.js'
import { SchedulerModule } from './modules/scheduler/scheduler.module.js'
import { SensitiveDataMaskInterceptor } from './common/interceptors/sensitive-data-mask.interceptor.js'

const dbLogger = new Logger('TypeOrmModule')

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        pinoHttp: {
          level: cfg.get('NODE_ENV') === 'production' ? 'info' : 'debug',
          // Em produção: JSON puro para CloudWatch/Datadog/etc.
          // Em desenvolvimento: pretty-print legível
          transport:
            cfg.get('NODE_ENV') !== 'production'
              ? {
                  target: 'pino-pretty',
                  options: { colorize: true, singleLine: true },
                }
              : undefined,
          // Gera ou propaga x-request-id para correlação de logs
          genReqId: (req: IncomingMessage, res: ServerResponse) => {
            const existing = req.headers['x-request-id']
            const id = (Array.isArray(existing) ? existing[0] : existing) || randomUUID()
            res.setHeader('x-request-id', id)
            return id
          },
          // Remove campos sensíveis dos logs de request HTTP
          redact: ['req.headers.authorization', 'req.body.password', 'req.body.refresh_token'],
          serializers: {
            req: (req: { method: string; url: string; id?: string }) => ({
              id: req.id,
              method: req.method,
              url: req.url,
            }),
          },
        },
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const host = cfg.get<string>('DB_HOST', 'localhost')
        const port = cfg.get<number>('DB_PORT', 5432)
        const database = cfg.get<string>('DB_DATABASE', 'health_hunter')
        const retryAttempts = cfg.get<number>('DB_RETRY_ATTEMPTS', 10)
        const retryDelay = cfg.get<number>('DB_RETRY_DELAY_MS', 3000)
        dbLogger.log(
          `Conectando ao PostgreSQL em ${host}:${port}/${database} ` +
            `(até ${retryAttempts} tentativas, intervalo de ${retryDelay}ms)`,
        )
        return {
          type: 'postgres',
          host,
          port,
          username: cfg.get<string>('DB_USERNAME', 'postgres'),
          password: cfg.get<string>('DB_PASSWORD', 'postgres'),
          database,
          autoLoadEntities: true,
          // synchronize only in non-production — use migrations in production
          synchronize: cfg.get<string>('NODE_ENV') !== 'production',
          ssl: cfg.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
          logging: cfg.get<string>('NODE_ENV') === 'development',
          retryAttempts,
          retryDelay,
          // Pool de conexões: ajustado para 0.25 vCPU / 512 MB (free tier)
          extra: {
            max: 5, // máximo de conexões simultâneas
            min: 1, // mínimo mantido em idle
            idleTimeoutMillis: 30000, // fecha conexões ociosas após 30 s
            connectionTimeoutMillis: 3000, // timeout de aquisição do pool
          },
        }
      },
    }),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      global: true,
    }),
    RedisCacheModule,
    RepositoriesModule,
    HealthModule,
    SchedulerModule,
    AuthModule,
    HuntersModule,
    ActivitiesModule,
    EventsModule,
    LeaderboardsModule,
    AdminModule,
    SeasonsModule,
    StoreModule,
    RankModule,
    GuildsModule,
    ChallengesModule,
    NotificationsModule,
    AchievementsModule,
    AiModule,
    MissionsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_INTERCEPTOR, useClass: SensitiveDataMaskInterceptor },
  ],
})
export class AppModule {}
