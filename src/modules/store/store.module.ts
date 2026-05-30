import { Module } from '@nestjs/common'
import { StoreController } from './store.controller'
import { StoreService } from './store.service'
import { RepositoriesModule } from '../../repositories/repositories.module'

@Module({
  imports: [RepositoriesModule],
  controllers: [StoreController],
  providers: [StoreService],
})
export class StoreModule {}
