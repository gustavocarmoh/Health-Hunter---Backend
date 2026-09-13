import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SchedulerService } from './scheduler.service.js'
import { RepositoriesModule } from '../../repositories/repositories.module.js'

@Module({
  imports: [ScheduleModule.forRoot(), TypeOrmModule.forFeature([]), RepositoriesModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
