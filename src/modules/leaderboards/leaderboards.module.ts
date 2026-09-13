import { Module } from '@nestjs/common'
import { LeaderboardsService } from './leaderboards.service.js'
import { LeaderboardsController } from './leaderboards.controller.js'
import { RepositoriesModule } from '../../repositories/repositories.module.js'

@Module({
  imports: [RepositoriesModule],
  controllers: [LeaderboardsController],
  providers: [LeaderboardsService],
})
export class LeaderboardsModule {}
