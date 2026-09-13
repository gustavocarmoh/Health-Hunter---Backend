import { Module } from '@nestjs/common'
import { NotificationsService } from './notifications.service.js'
import { NotificationsController } from './notifications.controller.js'
import { RepositoriesModule } from '../../repositories/repositories.module.js'

@Module({
  imports: [RepositoriesModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
