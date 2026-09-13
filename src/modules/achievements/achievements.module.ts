import { Module } from '@nestjs/common'
import { AchievementsService } from './achievements.service.js'
import { AchievementsController } from './achievements.controller.js'
import { RepositoriesModule } from '../../repositories/repositories.module.js'

@Module({
  imports: [RepositoriesModule],
  controllers: [AchievementsController],
  providers: [AchievementsService],
})
export class AchievementsModule {}
