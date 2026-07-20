import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { User } from '../entities/user.entity';
import {
  CreatePropertyRecordDto,
  SearchPropertyRecordDto,
} from './dto/create-property-record.dto';
import { PropertyRecordsService } from './property-records.service';

@Controller('api/property-records')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PropertyRecordsController {
  constructor(private readonly service: PropertyRecordsService) {}

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSISTANT_ADMIN,
    UserRole.ADMIN,
    UserRole.USER,
  )
  list(@Query() filters: SearchPropertyRecordDto) {
    return this.service.findAll(filters);
  }

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSISTANT_ADMIN,
    UserRole.ADMIN,
    UserRole.USER,
  )
  create(
    @Body() dto: CreatePropertyRecordDto,
    @CurrentUser() user: User,
  ) {
    return this.service.create(dto, user);
  }

  @Delete(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSISTANT_ADMIN,
    UserRole.ADMIN,
    UserRole.USER,
  )
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.remove(id, user);
  }
}
