import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { RepositoriesModule } from '../../repositories/repositories.module.js'
import { AiService } from './ai.service.js'
import { AiController } from './ai.controller.js'

@Module({
  imports: [RepositoriesModule, ConfigModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
