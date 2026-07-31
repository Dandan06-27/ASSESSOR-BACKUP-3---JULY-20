import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../app.module';
import { User } from '../entities/user.entity';
import { UserRole, UserStatus } from '../common/enums';

jest.setTimeout(30000);

describe('Users password endpoint (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let superAdminToken: string;
  let targetUser: User;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userRepo = moduleFixture.get<Repository<User>>(getRepositoryToken(User));

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@gov.ph',
        password: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@2026',
      })
      .expect(201);

    superAdminToken = loginResponse.body.accessToken;

    targetUser = await userRepo.save(
      userRepo.create({
        email: `test-user-${Date.now()}@example.com`,
        password: await bcrypt.hash('Initial123!', 10),
        fullName: 'Test Participant',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      }),
    );
  });

  afterAll(async () => {
    if (targetUser?.id) {
      await userRepo.delete({ id: targetUser.id });
    }
    await app.close();
  });

  it('allows Super Admin to update a user password through the endpoint', async () => {
    const newPassword = 'NewPassword@123';

    await request(app.getHttpServer())
      .patch(`/api/users/${targetUser.id}/password`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ password: newPassword })
      .expect(200);

    const updated = await userRepo
      .createQueryBuilder('user')
      .select(['user.password'])
      .where('user.id = :id', { id: targetUser.id })
      .getOne();
    expect(updated).toBeDefined();
    expect(await bcrypt.compare(newPassword, updated.password)).toBe(true);
  });
});
