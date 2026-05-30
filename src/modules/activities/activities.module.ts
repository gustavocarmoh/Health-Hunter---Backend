import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common'
import { ActivitiesService } from './activities.service'
import { ActivitiesController } from './activities.controller'
import { ActivityTelemetryListener } from './listeners/activity-telemetry.listener'
import { HunterRankUpListener } from './listeners/hunter-rank-up.listener'
import { RepositoriesModule } from '../../repositories/repositories.module'
import { createAjvMiddleware } from '../../common/middleware/ajv-body.middleware'
import { logActivitySchema } from './dto/log-activity.schema'

@Module({
  imports: [RepositoriesModule],
  controllers: [ActivitiesController],
  providers: [ActivitiesService, ActivityTelemetryListener, HunterRankUpListener],
})
export class ActivitiesModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(createAjvMiddleware(logActivitySchema))
      .forRoutes({ path: 'activities/log', method: RequestMethod.POST })
  }
}
