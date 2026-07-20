import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserRole, UserStatus } from '../common/enums';
import { Notification } from '../entities/notification.entity';
import { User } from '../entities/user.entity';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly realtime: RealtimeGateway,
  ) {}

  async notifyUser(
    userId: string,
    type: string,
    title: string,
    message: string,
    metadata?: Record<string, unknown>,
  ) {
    const notification = await this.notifRepo.save(
      this.notifRepo.create({ userId, type, title, message, metadata }),
    );
    this.realtime.emitToUser(userId, 'notification', notification);
    return notification;
  }

  async notifyAdmins(
    type: string,
    title: string,
    message: string,
    metadata?: Record<string, unknown>,
  ) {
    const admins = await this.userRepo.find({
      where: {
        role: In([UserRole.SUPER_ADMIN, UserRole.ASSISTANT_ADMIN]),
        status: UserStatus.ACTIVE,
      },
    });
    for (const admin of admins) {
      await this.notifyUser(admin.id, type, title, message, metadata);
    }
  }

  async getForUser(userId: string) {
    return this.notifRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async markRead(id: string, userId: string) {
    await this.notifRepo.update({ id, userId }, { read: true });
    return { success: true };
  }

  async unreadCount(userId: string) {
    return this.notifRepo.count({ where: { userId, read: false } });
  }
}
