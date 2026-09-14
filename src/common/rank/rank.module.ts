import { Global, Module } from '@nestjs/common'
import { RankEngineService } from './rank-engine.service.js'
import { RepositoriesModule } from '../../repositories/repositories.module.js'

@Global()
@Module({
  imports: [RepositoriesModule],
  providers: [RankEngineService],
  exports: [RankEngineService],
})
export class RankModule {}
