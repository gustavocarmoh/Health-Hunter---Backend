import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common'
import { HuntersService } from './hunters.service.js'
import { HuntersController } from './hunters.controller.js'
import { RepositoriesModule } from '../../repositories/repositories.module.js'
import { createAjvMiddleware } from '../../common/middleware/ajv-body.middleware.js'
import { updateHunterProfileSchema } from './dto/update-hunter-profile.schema.js'

@Module({
  imports: [RepositoriesModule],
  controllers: [HuntersController],
  providers: [HuntersService],
  exports: [HuntersService],
})
export class HuntersModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(createAjvMiddleware(updateHunterProfileSchema))
      .forRoutes({ path: 'hunters/profile', method: RequestMethod.PATCH })
  }
}
