import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuditService } from './audit.service';

@Controller('api/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ASSISTANT_ADMIN)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get('logs')
  logs() {
    return this.audit.findAll(200);
  }
}
