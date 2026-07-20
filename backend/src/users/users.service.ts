import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { UserRole, UserStatus } from '../common/enums';
import { AuditService } from '../audit/audit.service';
import { User } from '../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeGateway,
  ) {}

  findAll() {
    return this.userRepo.find({
      relations: { division: true },
      order: { fullName: 'ASC' },
    });
  }

  async findOne(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: { division: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const { password: _, ...safe } = user;
    return safe;
  }

  async approveUser(id: string, approver: User, approve = true) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.status !== UserStatus.PENDING) {
      throw new BadRequestException('User is not pending approval');
    }

    user.status = approve ? UserStatus.ACTIVE : UserStatus.INACTIVE;
    await this.userRepo.save(user);

    if (approve) {
      await this.notifications.notifyUser(
        user.id,
        'account_approved',
        'Account approved',
        'Your account has been approved. You may now log in.',
      );
    }

    await this.audit.log({
      userId: approver.id,
      action: approve ? 'APPROVE_USER' : 'REJECT_USER',
      entity: 'user',
      entityId: user.id,
    });

    this.realtime.broadcast('users_updated', { userId: id });
    const { password: _, ...safe } = user;
    return safe;
  }

  async updateStatus(id: string, status: UserStatus, actor: User) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === UserRole.SUPER_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Cannot modify Super Admin');
    }
    user.status = status;
    await this.userRepo.save(user);
    await this.audit.log({
      userId: actor.id,
      action: 'UPDATE_STATUS',
      entity: 'user',
      entityId: id,
      details: { status },
    });
    const { password: _, ...safe } = user;
    return safe;
  }

  async updateProfile(
    id: string,
    data: Partial<User>,
    actor: User,
    isSelf: boolean,
  ) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const allowed = [
      'fullName',
      'position',
      'contactNumber',
      'address',
      'bio',
      'profilePicture',
      'divisionId',
    ] as const;

    for (const key of allowed) {
      if (data[key] !== undefined && (isSelf || this.canManage(actor))) {
        (user as unknown as Record<string, unknown>)[key] = data[key];
      }
    }

    await this.userRepo.save(user);
    const { password: _, ...safe } = user;
    return safe;
  }

  async promoteRole(id: string, role: UserRole, actor: User) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Cannot promote to Super Admin via chart');
    }
    if (role === UserRole.ASSISTANT_ADMIN || role === UserRole.ADMIN) {
      throw new BadRequestException(
        'Elevated roles require “Assign role” with secret key',
      );
    }
    user.role = role;
    await this.userRepo.save(user);
    await this.audit.log({
      userId: actor.id,
      action: 'PROMOTE_ROLE',
      entity: 'user',
      entityId: id,
      details: { role },
    });
    const { password: _, ...safe } = user;
    return safe;
  }

  async updateOrg(id: string, orgParentId: string | null, orgSortOrder: number) {
    await this.userRepo.update(id, { orgParentId, orgSortOrder });
    return this.findOne(id);
  }

  getPending() {
    return this.userRepo.find({
      where: { status: UserStatus.PENDING },
      relations: { division: true },
      order: { createdAt: 'DESC' },
    });
  }

  canManage(actor: User) {
    return [UserRole.SUPER_ADMIN, UserRole.ASSISTANT_ADMIN].includes(
      actor.role,
    );
  }
}
