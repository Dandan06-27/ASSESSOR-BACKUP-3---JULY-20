import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacService } from './rbac.service';
import { CreateRoleDto, CreatePermissionDto } from './dto/rbac.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/enums';

@Controller('rbac')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  // Roles Endpoints
  @Get('roles')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSISTANT_ADMIN)
  async getAllRoles() {
    return this.rbacService.getAllRoles();
  }

  @Post('roles')
  @Roles(UserRole.SUPER_ADMIN)
  async createRole(@Body() dto: CreateRoleDto) {
    return this.rbacService.createRole(
      dto.name,
      dto.description,
      dto.permissionIds,
    );
  }

  // Permissions Endpoints
  @Get('permissions')
  async getAllPermissions() {
    return this.rbacService.getAllPermissions();
  }

  @Post('permissions')
  @Roles(UserRole.SUPER_ADMIN)
  async createPermission(@Body() dto: CreatePermissionDto) {
    return this.rbacService.createPermission(
      dto.code,
      dto.description,
      dto.category,
    );
  }

  // User Roles Management
  @Get('users/:userId/roles')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSISTANT_ADMIN)
  async getUserRoles(@Param('userId') userId: string) {
    return this.rbacService.getUserRoles(userId);
  }

  @Get('users/:userId/permissions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSISTANT_ADMIN)
  async getUserPermissions(@Param('userId') userId: string) {
    return this.rbacService.getUserPermissions(userId);
  }

  @Post('users/:userId/roles/:roleId')
  @Roles(UserRole.SUPER_ADMIN)
  async assignRoleToUser(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ) {
    await this.rbacService.assignRoleToUser(userId, roleId);
    return { message: 'Role assigned successfully' };
  }

  @Delete('users/:userId/roles/:roleId')
  @Roles(UserRole.SUPER_ADMIN)
  async removeRoleFromUser(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ) {
    await this.rbacService.removeRoleFromUser(userId, roleId);
    return { message: 'Role removed successfully' };
  }

  // Role Permissions Management
  @Post('roles/:roleId/permissions/:permissionId')
  @Roles(UserRole.SUPER_ADMIN)
  async addPermissionToRole(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
  ) {
    await this.rbacService.addPermissionToRole(roleId, permissionId);
    return { message: 'Permission added to role successfully' };
  }

  @Delete('roles/:roleId/permissions/:permissionId')
  @Roles(UserRole.SUPER_ADMIN)
  async removePermissionFromRole(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
  ) {
    await this.rbacService.removePermissionFromRole(roleId, permissionId);
    return { message: 'Permission removed from role successfully' };
  }
}
