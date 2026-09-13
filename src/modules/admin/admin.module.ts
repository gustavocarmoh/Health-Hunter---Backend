import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common'
import { AdminService } from './admin.service.js'
import { AdminController } from './admin.controller.js'
import { RepositoriesModule } from '../../repositories/repositories.module.js'
import { createAjvMiddleware } from '../../common/middleware/ajv-body.middleware.js'
import { assignRoleSchema } from './dto/assign-role.schema.js'
import { assignRankSchema } from './dto/assign-rank.schema.js'
import { createChallengeSchema } from './dto/create-challenge.schema.js'
import { createEventSchema } from './dto/create-event.schema.js'
import { updateEventSchema } from './dto/update-event.schema.js'

@Module({
  imports: [RepositoriesModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(createAjvMiddleware(assignRoleSchema)).forRoutes({
      path: 'admin/users/:id/assign-role',
      method: RequestMethod.PATCH,
    })

    consumer.apply(createAjvMiddleware(assignRankSchema)).forRoutes({
      path: 'admin/users/:id/assign-rank',
      method: RequestMethod.PATCH,
    })

    consumer.apply(createAjvMiddleware(createChallengeSchema)).forRoutes({
      path: 'admin/challenges/create',
      method: RequestMethod.POST,
    })

    consumer
      .apply(createAjvMiddleware(createEventSchema))
      .forRoutes({ path: 'admin/events/create', method: RequestMethod.POST })

    consumer
      .apply(createAjvMiddleware(updateEventSchema))
      .forRoutes({ path: 'admin/events/:id', method: RequestMethod.PATCH })
  }
}
