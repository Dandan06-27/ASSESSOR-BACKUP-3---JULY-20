import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '../entities/task.entity';
import { RealtimeModule } from '../realtime/realtime.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Task]), RealtimeModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
