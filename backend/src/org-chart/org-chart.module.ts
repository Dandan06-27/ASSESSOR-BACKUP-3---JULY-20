import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { OrgChartController } from './org-chart.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [OrgChartController],
})
export class OrgChartModule {}
