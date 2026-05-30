import { Module } from '@nestjs/common'
import { ChallengesService } from './challenges.service'
import { ChallengesController } from './challenges.controller'
import { RepositoriesModule } from '../../repositories/repositories.module'

@Module({
  imports: [RepositoriesModule],
  controllers: [ChallengesController],
  providers: [ChallengesService],
})
export class ChallengesModule {}
