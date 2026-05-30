import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SchedulerService } from './scheduler.service'
import { RepositoriesModule } from '../../repositories/repositories.module'

@Module({
  imports: [ScheduleModule.forRoot(), TypeOrmModule.forFeature([]), RepositoriesModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
