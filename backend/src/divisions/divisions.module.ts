import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Division } from '../entities/division.entity';
import { DivisionsController } from './divisions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Division])],
  controllers: [DivisionsController],
})
export class DivisionsModule {}
