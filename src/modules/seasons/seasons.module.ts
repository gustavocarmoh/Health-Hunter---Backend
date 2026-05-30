import { Module } from '@nestjs/common'
import { SeasonsController } from './seasons.controller'
import { SeasonsService } from './seasons.service'
import { RepositoriesModule } from '../../repositories/repositories.module'

@Module({
  imports: [RepositoriesModule],
  controllers: [SeasonsController],
  providers: [SeasonsService],
})
export class SeasonsModule {}
