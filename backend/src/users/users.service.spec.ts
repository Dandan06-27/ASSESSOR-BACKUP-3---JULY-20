import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../common/enums';
import { AuditService } from '../audit/audit.service';
import { User } from '../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let repo: {
    findOne: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: repo,
        },
        {
          provide: AuditService,
          useValue: { log: jest.fn() },
        },
        {
          provide: NotificationsService,
          useValue: { notifyUser: jest.fn(), notifyAdmins: jest.fn() },
        },
        {
          provide: RealtimeGateway,
          useValue: { broadcast: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  it('hashes and saves a new password for a target user when requested by a super admin', async () => {
    const actor = { id: 'actor-id', role: UserRole.SUPER_ADMIN } as User;
    const target = {
      id: 'target-id',
      email: 'participant@example.com',
      role: UserRole.USER,
      password: 'old-hash',
      fullName: 'Participant',
    } as User;

    repo.findOne.mockResolvedValue(target);
    repo.save.mockImplementation(async (user) => user);

    const result = await service.updatePassword('target-id', 'NewPassword@123', actor);

    expect(repo.save).toHaveBeenCalledTimes(1);
    const savedUser = repo.save.mock.calls[0][0];
    expect(savedUser.password).not.toEqual('NewPassword@123');
    expect(await bcrypt.compare('NewPassword@123', savedUser.password)).toBe(true);
    expect(result.id).toBe('target-id');
  });

  it('rejects password changes when the actor is not a super admin', async () => {
    const actor = { id: 'actor-id', role: UserRole.ADMIN } as User;
    const target = { id: 'target-id', password: 'old-hash' } as User;

    repo.findOne.mockResolvedValue(target);

    await expect(service.updatePassword('target-id', 'NewPassword@123', actor)).rejects.toThrow(BadRequestException);
  });
});
