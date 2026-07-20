import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, UserStatus } from '../common/enums';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AssignRoleDto } from '../auth/dto/auth.dto';
import { User } from '../entities/user.entity';
import { UsersService } from './users.service';

@Controller('api/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSISTANT_ADMIN, UserRole.ADMIN)
  list() {
    return this.users.findAll();
  }

  @Get('pending')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSISTANT_ADMIN)
  pending() {
    return this.users.getPending();
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  @Patch(':id/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSISTANT_ADMIN)
  approve(
    @Param('id') id: string,
    @Body('approve') approve: boolean,
    @CurrentUser() actor: User,
  ) {
    return this.users.approveUser(id, actor, approve !== false);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSISTANT_ADMIN)
  status(
    @Param('id') id: string,
    @Body('status') status: UserStatus,
    @CurrentUser() actor: User,
  ) {
    return this.users.updateStatus(id, status, actor);
  }

  @Patch(':id/profile')
  updateProfile(
    @Param('id') id: string,
    @Body() body: Partial<User>,
    @CurrentUser() actor: User,
  ) {
    const isSelf = actor.id === id;
    return this.users.updateProfile(id, body, actor, isSelf);
  }

  @Post(':id/assign-role')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSISTANT_ADMIN)
  assignRole(
    @Param('id') id: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() actor: User,
  ) {
    return this.auth.assignRole(id, dto, actor);
  }

  @Patch(':id/promote')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSISTANT_ADMIN)
  promote(
    @Param('id') id: string,
    @Body('role') role: UserRole,
    @CurrentUser() actor: User,
  ) {
    return this.users.promoteRole(id, role, actor);
  }

  @Patch(':id/org')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSISTANT_ADMIN)
  org(
    @Param('id') id: string,
    @Body('orgParentId') orgParentId: string | null,
    @Body('orgSortOrder') orgSortOrder: number,
  ) {
    return this.users.updateOrg(id, orgParentId, orgSortOrder ?? 0);
  }
}
