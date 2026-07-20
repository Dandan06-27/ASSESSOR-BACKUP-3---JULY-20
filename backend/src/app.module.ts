import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { DocumentsModule } from './documents/documents.module';
import { DivisionsModule } from './divisions/divisions.module';
import { AuditLog } from './entities/audit-log.entity';
import { Division } from './entities/division.entity';
import { Document } from './entities/document.entity';
import { LandRecord } from './entities/land-record.entity';
import { Notification } from './entities/notification.entity';
import { TracerTree } from './entities/tracer-tree.entity';
import { Permission } from './entities/permission.entity';
import { PropertyRecord } from './entities/property-record.entity';
import { Role } from './entities/role.entity';
import { Task } from './entities/task.entity';
import { User } from './entities/user.entity';
import { NotificationsModule } from './notifications/notifications.module';
import { OrgChartModule } from './org-chart/org-chart.module';
import { PropertyRecordsModule } from './property-records/property-records.module';
import { RbacModule } from './rbac/rbac.module';
import { RealtimeModule } from './realtime/realtime.module';
import { RecordsModule } from './records/records.module';
import { SeedModule } from './seed/seed.module';
import { SystemModule } from './system/system.module';
import { TasksModule } from './tasks/tasks.module';
import { UsersModule } from './users/users.module';
import { TracerModule } from './tracer/tracer.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: parseInt(config.get('DB_PORT', '5432'), 10),
        username: config.get('DB_USERNAME', 'landbook'),
        password: config.get('DB_PASSWORD', 'landbook_secret'),
        database: config.get('DB_DATABASE', 'land_bookkeeping'),
        entities: [
          User,
          Role,
          Permission,
          Division,
          LandRecord,
          PropertyRecord,
          Task,
          Notification,
          AuditLog,
          Document,
          TracerTree,
        ],
        synchronize: true,
        timezone: 'Asia/Manila',
      }),
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'frontend'),
      exclude: ['/api/(.*)'],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'QGIS_WEB'),
      serveRoot: '/QGIS_WEB',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'storage'),
      serveRoot: '/storage',
    }),
    AuditModule,
    AuthModule,
    UsersModule,
    RbacModule,
    RecordsModule,
    PropertyRecordsModule,
    TasksModule,
    NotificationsModule,
    RealtimeModule,
    DivisionsModule,
    DocumentsModule,
    OrgChartModule,
    SystemModule,
    SeedModule,
    // tracer module provides endpoints for saving/loading tracer tree
    TracerModule,
  ],
})
export class AppModule {}
