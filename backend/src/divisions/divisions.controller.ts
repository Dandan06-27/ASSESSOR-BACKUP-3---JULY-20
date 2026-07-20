import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Division } from '../entities/division.entity';

@Controller('api/divisions')
export class DivisionsController {
  constructor(
    @InjectRepository(Division)
    private readonly divisionRepo: Repository<Division>,
  ) {}

  @Get()
  list() {
    return this.divisionRepo.find({ order: { name: 'ASC' } });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSISTANT_ADMIN)
  create(@Body() body: { name: string; description?: string }) {
    return this.divisionRepo.save(this.divisionRepo.create(body));
  }
}
