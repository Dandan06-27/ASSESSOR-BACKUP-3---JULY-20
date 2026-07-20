import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertyRecord } from '../entities/property-record.entity';
import { PropertyRecordsController } from './property-records.controller';
import { PropertyRecordsService } from './property-records.service';

@Module({
  imports: [TypeOrmModule.forFeature([PropertyRecord])],
  controllers: [PropertyRecordsController],
  providers: [PropertyRecordsService],
  exports: [PropertyRecordsService],
})
export class PropertyRecordsModule {}
