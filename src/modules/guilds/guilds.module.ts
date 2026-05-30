import { Module } from '@nestjs/common'
import { GuildsController } from './guilds.controller'
import { GuildsService } from './guilds.service'
import { RepositoriesModule } from '../../repositories/repositories.module'

@Module({
  imports: [RepositoriesModule],
  controllers: [GuildsController],
  providers: [GuildsService],
})
export class GuildsModule {}
