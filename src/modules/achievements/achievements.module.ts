import { Module } from '@nestjs/common'
import { AchievementsService } from './achievements.service'
import { AchievementsController } from './achievements.controller'
import { RepositoriesModule } from '../../repositories/repositories.module'

@Module({
  imports: [RepositoriesModule],
  controllers: [AchievementsController],
  providers: [AchievementsService],
})
export class AchievementsModule {}
