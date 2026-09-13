import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common'
import { ActivitiesService } from './activities.service.js'
import { ActivitiesController } from './activities.controller.js'
import { ActivityTelemetryListener } from './listeners/activity-telemetry.listener.js'
import { HunterRankUpListener } from './listeners/hunter-rank-up.listener.js'
import { RepositoriesModule } from '../../repositories/repositories.module.js'
import { createAjvMiddleware } from '../../common/middleware/ajv-body.middleware.js'
import { logActivitySchema } from './dto/log-activity.schema.js'

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
