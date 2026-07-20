import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TracerController } from './tracer.controller';
import { TracerService } from './tracer.service';
import { TracerTree } from '../entities/tracer-tree.entity';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [TypeOrmModule.forFeature([TracerTree]), RealtimeModule],
  controllers: [TracerController],
  providers: [TracerService],
  exports: [TracerService],
})
export class TracerModule {}
