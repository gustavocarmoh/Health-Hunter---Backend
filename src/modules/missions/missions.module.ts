import { Module } from '@nestjs/common'
import { MissionsService } from './missions.service.js'
import { MissionsController } from './missions.controller.js'
import { RepositoriesModule } from '../../repositories/repositories.module.js'

@Module({
  imports: [RepositoriesModule],
  controllers: [MissionsController],
  providers: [MissionsService],
  exports: [MissionsService],
})
export class MissionsModule {}
