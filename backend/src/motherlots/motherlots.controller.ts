import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { MotherLotsService } from './motherlots.service';
import { CreateMotherLotDto, UpdateMotherLotDto } from './dto/mother-lot.dto';
import { User } from '../entities/user.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('api/motherlots')
@UseGuards(JwtAuthGuard)
export class MotherLotsController {
  constructor(private readonly motherLotsService: MotherLotsService) {}

  @Post()
  async create(
    @Body() dto: CreateMotherLotDto,
    @CurrentUser() user: User,
  ) {
    return await this.motherLotsService.create(dto, user);
  }

  @Get()
  async findAll() {
    return await this.motherLotsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.motherLotsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMotherLotDto,
    @CurrentUser() user: User,
  ) {
    return await this.motherLotsService.update(id, dto, user);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return await this.motherLotsService.remove(id, user);
  }
}
