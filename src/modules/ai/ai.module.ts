import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { RepositoriesModule } from '../../repositories/repositories.module'
import { AiService } from './ai.service'
import { AiController } from './ai.controller'

@Module({
  imports: [RepositoriesModule, ConfigModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
