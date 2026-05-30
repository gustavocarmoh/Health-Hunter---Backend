import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common'
import { HuntersService } from './hunters.service'
import { HuntersController } from './hunters.controller'
import { RepositoriesModule } from '../../repositories/repositories.module'
import { createAjvMiddleware } from '../../common/middleware/ajv-body.middleware'
import { updateHunterProfileSchema } from './dto/update-hunter-profile.schema'

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
