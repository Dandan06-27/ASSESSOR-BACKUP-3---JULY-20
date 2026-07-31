import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../enums';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;

  beforeEach(() => {
    guard = new RolesGuard(new Reflector());
  });

  it('allows access when no roles are defined', () => {
    const context = {
      getHandler: () => () => {},
      getClass: () => class {},
      switchToHttp: () => ({ getRequest: () => ({}) }),
    } as any;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when the request user has a required role', () => {
    class TestController {
      @Roles(UserRole.SUPER_ADMIN)
      test() {}
    }

    const context = {
      getHandler: () => TestController.prototype.test,
      getClass: () => TestController,
      switchToHttp: () => ({ getRequest: () => ({ user: { role: UserRole.SUPER_ADMIN } }) }),
    } as any;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies access when the request user is missing', () => {
    class TestController {
      @Roles(UserRole.SUPER_ADMIN)
      test() {}
    }

    const context = {
      getHandler: () => TestController.prototype.test,
      getClass: () => TestController,
      switchToHttp: () => ({ getRequest: () => ({}) }),
    } as any;

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('denies access when the user role does not match', () => {
    class TestController {
      @Roles(UserRole.SUPER_ADMIN)
      test() {}
    }

    const context = {
      getHandler: () => TestController.prototype.test,
      getClass: () => TestController,
      switchToHttp: () => ({ getRequest: () => ({ user: { role: UserRole.ADMIN } }) }),
    } as any;

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
