import { Module } from '@nestjs/common'
import { MissionsService } from './missions.service'
import { MissionsController } from './missions.controller'
import { RepositoriesModule } from '../../repositories/repositories.module'

@Module({
  imports: [RepositoriesModule],
  controllers: [MissionsController],
  providers: [MissionsService],
  exports: [MissionsService],
})
export class MissionsModule {}
