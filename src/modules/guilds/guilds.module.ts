import { Module } from '@nestjs/common'
import { GuildsController } from './guilds.controller.js'
import { GuildsService } from './guilds.service.js'
import { RepositoriesModule } from '../../repositories/repositories.module.js'

@Module({
  imports: [RepositoriesModule],
  controllers: [GuildsController],
  providers: [GuildsService],
})
export class GuildsModule {}
