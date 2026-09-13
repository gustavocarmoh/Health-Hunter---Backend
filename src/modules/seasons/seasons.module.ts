import { Module } from '@nestjs/common'
import { SeasonsController } from './seasons.controller.js'
import { SeasonsService } from './seasons.service.js'
import { RepositoriesModule } from '../../repositories/repositories.module.js'

@Module({
  imports: [RepositoriesModule],
  controllers: [SeasonsController],
  providers: [SeasonsService],
})
export class SeasonsModule {}
