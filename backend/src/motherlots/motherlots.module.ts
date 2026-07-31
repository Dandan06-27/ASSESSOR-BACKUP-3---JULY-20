import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MotherLot } from '../entities/mother-lot.entity';
import { MotherLotsController } from './motherlots.controller';
import { MotherLotsService } from './motherlots.service';
import { AuditModule } from '../audit/audit.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MotherLot]),
    AuditModule,
    RealtimeModule,
  ],
  controllers: [MotherLotsController],
  providers: [MotherLotsService],
  exports: [MotherLotsService],
})
export class MotherLotsModule {}
