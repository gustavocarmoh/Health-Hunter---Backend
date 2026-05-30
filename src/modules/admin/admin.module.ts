import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common'
import { AdminService } from './admin.service'
import { AdminController } from './admin.controller'
import { RepositoriesModule } from '../../repositories/repositories.module'
import { createAjvMiddleware } from '../../common/middleware/ajv-body.middleware'
import { assignRoleSchema } from './dto/assign-role.schema'
import { assignRankSchema } from './dto/assign-rank.schema'
import { createChallengeSchema } from './dto/create-challenge.schema'
import { createEventSchema } from './dto/create-event.schema'
import { updateEventSchema } from './dto/update-event.schema'

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
