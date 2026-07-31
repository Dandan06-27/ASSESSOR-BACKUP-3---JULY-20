import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
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

  @Post(':id/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadDir = join(__dirname, '..', '..', 'storage', 'avatars');
          try {
            require('fs').mkdirSync(uploadDir, { recursive: true });
          } catch (err) {
            return cb(err, uploadDir);
          }
          cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: User,
  ) {
    return this.users.updateAvatar(id, file, actor);
  }

  @Patch(':id/password')
  @Roles(UserRole.SUPER_ADMIN)
  updatePassword(
    @Param('id') id: string,
    @Body('password') password: string,
    @CurrentUser() actor: User,
  ) {
    return this.users.updatePassword(id, password, actor);
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
