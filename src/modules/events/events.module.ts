import { Module } from '@nestjs/common'
import { EventsService } from './events.service.js'
import { EventsController } from './events.controller.js'
import { RepositoriesModule } from '../../repositories/repositories.module.js'

@Module({
  imports: [RepositoriesModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
