import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { User } from '../entities/user.entity';
import {
  CreateLandRecordDto,
  SearchLandDto,
  UpdateLandRecordDto,
} from './dto/land-record.dto';
import { RecordsService } from './records.service';

@Controller('api/records')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecordsController {
  constructor(private readonly records: RecordsService) {}

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSISTANT_ADMIN,
    UserRole.ADMIN,
    UserRole.USER,
  )
  list(@Query() filters: SearchLandDto) {
    return this.records.findAll(filters);
  }

  @Get('overview')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSISTANT_ADMIN,
    UserRole.ADMIN,
    UserRole.USER,
  )
  overview(@Query() filters: SearchLandDto) {
    return this.records.overview(filters);
  }

  @Get('view-land')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSISTANT_ADMIN,
    UserRole.ADMIN,
    UserRole.USER,
  )
  viewLand(@Query() filters: SearchLandDto) {
    return this.records.searchViewLand(filters);
  }

  @Get('gis')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSISTANT_ADMIN,
    UserRole.ADMIN,
    UserRole.USER,
  )
  gis() {
    return this.records.gisMarkers();
  }

  @Delete()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  bulkRemove(@Body() body: { ids: string[] }, @CurrentUser() user: User) {
    return this.records.bulkRemove(body.ids, user);
  }

  @Post('bulk-delete')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  bulkDelete(@Body() body: { ids: string[] }, @CurrentUser() user: User) {
    return this.records.bulkRemove(body.ids, user);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.records.remove(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSISTANT_ADMIN, UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLandRecordDto,
    @CurrentUser() user: User,
  ) {
    return this.records.update(id, dto, user);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSISTANT_ADMIN, UserRole.ADMIN)
  create(@Body() dto: CreateLandRecordDto, @CurrentUser() user: User) {
    return this.records.create(dto, user);
  }

  @Post('import/qgis')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSISTANT_ADMIN, UserRole.ADMIN)
  importQgis(@CurrentUser() user: User) {
    return this.records.bulkImportQgis(user);
  }

  @Post('upload-qgis')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSISTANT_ADMIN, UserRole.ADMIN)
  uploadQgis(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    return this.records.validateQgisUpload(file, user);
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSISTANT_ADMIN,
    UserRole.ADMIN,
    UserRole.USER,
  )
  one(@Param('id') id: string) {
    return this.records.findOne(id);
  }
}
