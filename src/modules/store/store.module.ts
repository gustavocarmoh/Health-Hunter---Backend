import { Module } from '@nestjs/common'
import { StoreController } from './store.controller.js'
import { StoreService } from './store.service.js'
import { RepositoriesModule } from '../../repositories/repositories.module.js'

@Module({
  imports: [RepositoriesModule],
  controllers: [StoreController],
  providers: [StoreService],
})
export class StoreModule {}
