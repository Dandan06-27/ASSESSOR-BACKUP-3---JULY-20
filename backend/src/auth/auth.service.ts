import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { UserRole, UserStatus } from '../common/enums';
import { formatPH } from '../common/utils/timezone';
import { AuditService } from '../audit/audit.service';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { AssignRoleDto, LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new BadRequestException('Email already registered');

    const user = this.userRepo.create({
      ...dto,
      password: await bcrypt.hash(dto.password, 10),
      role: UserRole.USER,
      status: UserStatus.PENDING,
    });
    const saved = await this.userRepo.save(user);

    // Assign User role
    const userRole = await this.roleRepo.findOne({ where: { name: 'User' } });
    if (userRole) {
      saved.roles = [userRole];
      await this.userRepo.save(saved);
    }

    await this.notifications.notifyAdmins(
      'registration_pending',
      'New registration pending approval',
      `${saved.fullName} (${saved.email}) registered and awaits approval.`,
      { userId: saved.id },
    );

    await this.audit.log({
      userId: saved.id,
      action: 'REGISTER',
      entity: 'user',
      entityId: saved.id,
      details: { email: saved.email },
    });

    const { password: _, ...safe } = saved;
    return {
      message: 'Registration submitted. Await admin approval before login.',
      user: safe,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      relations: { division: true },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        status: true,
        fullName: true,
        position: true,
        divisionId: true,
        profilePicture: true,
        contactNumber: true,
        address: true,
        bio: true,
      },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (user.status === UserStatus.PENDING) {
      throw new UnauthorizedException(
        'Account pending approval. Please wait for admin activation.',
      );
    }
    if (user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.audit.log({
      userId: user.id,
      action: 'LOGIN',
      entity: 'user',
      entityId: user.id,
      details: { at: formatPH(new Date()) },
    });

    const { password: _, ...safe } = user;
    return { accessToken: token, user: safe };
  }

  async me(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { division: true },
    });
    if (!user) throw new UnauthorizedException();
    const { password: _, ...safe } = user;
    return safe;
  }

  async assignRole(
    targetUserId: string,
    dto: AssignRoleDto,
    actor: User,
  ) {
    const secret = this.config.get<string>('ADMIN_ROLE_SECRET_KEY');
    if (dto.adminSecretKey !== secret) {
      throw new UnauthorizedException('Invalid admin secret key');
    }

    if (dto.role === UserRole.SUPER_ADMIN) {
      throw new UnauthorizedException('Cannot assign Super Admin role');
    }
    if (
      dto.role === UserRole.ASSISTANT_ADMIN &&
      actor.role !== UserRole.SUPER_ADMIN
    ) {
      throw new UnauthorizedException(
        'Only Super Admin can assign Assistant Admin',
      );
    }
    if (
      dto.role === UserRole.ADMIN &&
      ![UserRole.SUPER_ADMIN, UserRole.ASSISTANT_ADMIN].includes(actor.role)
    ) {
      throw new UnauthorizedException(
        'Only Super Admin or Assistant Admin can assign Admin roles',
      );
    }

    const target = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!target) throw new BadRequestException('User not found');

    target.role = dto.role;
    if (dto.divisionId) target.divisionId = dto.divisionId;
    await this.userRepo.save(target);

    await this.notifications.notifyAdmins(
      'role_assigned',
      'Role assignment completed',
      `${actor.fullName} assigned role ${dto.role} to ${target.fullName}.`,
      { userId: target.id, role: dto.role },
    );

    await this.audit.log({
      userId: actor.id,
      action: 'ASSIGN_ROLE',
      entity: 'user',
      entityId: target.id,
      details: { role: dto.role },
    });

    const { password: _, ...safe } = target;
    return safe;
  }
}
