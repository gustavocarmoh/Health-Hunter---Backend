import { Module } from '@nestjs/common'
import { ChallengesService } from './challenges.service.js'
import { ChallengesController } from './challenges.controller.js'
import { RepositoriesModule } from '../../repositories/repositories.module.js'

@Module({
  imports: [RepositoriesModule],
  controllers: [ChallengesController],
  providers: [ChallengesService],
})
export class ChallengesModule {}
