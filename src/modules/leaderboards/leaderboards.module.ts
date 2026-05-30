import { Module } from '@nestjs/common'
import { LeaderboardsService } from './leaderboards.service'
import { LeaderboardsController } from './leaderboards.controller'
import { RepositoriesModule } from '../../repositories/repositories.module'

@Module({
  imports: [RepositoriesModule],
  controllers: [LeaderboardsController],
  providers: [LeaderboardsService],
})
export class LeaderboardsModule {}
