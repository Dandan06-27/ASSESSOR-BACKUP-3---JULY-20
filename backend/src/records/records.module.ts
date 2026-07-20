import { Module } from '@nestjs/common';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LandRecord } from '../entities/land-record.entity';
import { RealtimeModule } from '../realtime/realtime.module';
import { RecordsController } from './records.controller';
import { RecordsService } from './records.service';

@Module({
  imports: [TypeOrmModule.forFeature([LandRecord]), RealtimeModule],
  controllers: [RecordsController],
  providers: [
    RecordsService,
    {
      provide: 'QGIS_EXPORT_REPO',
      useFactory: () => {
        return {
          async findOne(opts: any) {
            try {
              const exportDir = join(process.cwd(), '..', 'storage', 'qgis-exports');
              const activePath = join(exportDir, 'active-export.json');
              if (!existsSync(activePath)) return null;
              const raw = readFileSync(activePath, 'utf8');
              const parsed = JSON.parse(raw);
              return parsed || null;
            } catch {
              return null;
            }
          },
        };
      },
    },
  ],
  exports: [RecordsService],
})
export class RecordsModule {}
