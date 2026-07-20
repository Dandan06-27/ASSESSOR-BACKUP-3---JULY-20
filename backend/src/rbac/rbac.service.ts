import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Check if a user has a specific permission
   */
  async hasPermission(userId: string, permissionCode: string): Promise<boolean> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { roles: { permissions: true } },
    });

    if (!user || !user.roles.length) return false;

    return user.roles.some((role) =>
      role.permissions.some((perm) => perm.code === permissionCode),
    );
  }

  /**
   * Check if a user has multiple permissions (AND logic)
   */
  async hasAllPermissions(
    userId: string,
    permissionCodes: string[],
  ): Promise<boolean> {
    const permissions = await Promise.all(
      permissionCodes.map((code) => this.hasPermission(userId, code)),
    );
    return permissions.every((has) => has);
  }

  /**
   * Check if a user has any of the specified permissions (OR logic)
   */
  async hasAnyPermission(
    userId: string,
    permissionCodes: string[],
  ): Promise<boolean> {
    const permissions = await Promise.all(
      permissionCodes.map((code) => this.hasPermission(userId, code)),
    );
    return permissions.some((has) => has);
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { roles: { permissions: true } },
    });

    if (!user || !user.roles.length) return [];

    const permissionsSet = new Set<string>();
    const permissions: Permission[] = [];

    user.roles.forEach((role) => {
      role.permissions.forEach((perm) => {
        if (!permissionsSet.has(perm.id)) {
          permissionsSet.add(perm.id);
          permissions.push(perm);
        }
      });
    });

    return permissions;
  }

  /**
   * Get all roles for a user
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { roles: true },
    });

    return user?.roles || [];
  }

  /**
   * Assign a role to a user
   */
  async assignRoleToUser(userId: string, roleId: string): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { roles: true },
    });

    const role = await this.roleRepo.findOne({
      where: { id: roleId },
    });

    if (user && role && !user.roles.find((r) => r.id === roleId)) {
      user.roles.push(role);
      await this.userRepo.save(user);
    }
  }

  /**
   * Remove a role from a user
   */
  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { roles: true },
    });

    if (user) {
      user.roles = user.roles.filter((r) => r.id !== roleId);
      await this.userRepo.save(user);
    }
  }

  /**
   * Get all roles
   */
  async getAllRoles(): Promise<Role[]> {
    return this.roleRepo.find({
      relations: { permissions: true },
    });
  }

  /**
   * Get all permissions
   */
  async getAllPermissions(): Promise<Permission[]> {
    return this.permissionRepo.find();
  }

  /**
   * Create a new role
   */
  async createRole(
    name: string,
    description?: string,
    permissionIds?: string[],
  ): Promise<Role> {
    const permissions =
      permissionIds && permissionIds.length > 0
        ? await this.permissionRepo.findBy({ id: In(permissionIds) })
        : [];

    const role = this.roleRepo.create({
      name,
      description,
      permissions,
    });

    return this.roleRepo.save(role);
  }

  /**
   * Create a new permission
   */
  async createPermission(
    code: string,
    description: string,
    category?: string,
  ): Promise<Permission> {
    const permission = this.permissionRepo.create({
      code,
      description,
      category,
    });

    return this.permissionRepo.save(permission);
  }

  /**
   * Add permission to a role
   */
  async addPermissionToRole(
    roleId: string,
    permissionId: string,
  ): Promise<Role | null> {
    const role = await this.roleRepo.findOne({
      where: { id: roleId },
      relations: { permissions: true },
    });

    const permission = await this.permissionRepo.findOne({
      where: { id: permissionId },
    });

    if (!role) return null;
    if (permission && !role.permissions.find((p) => p.id === permissionId)) {
      role.permissions.push(permission);
      return this.roleRepo.save(role);
    }

    return role;
  }

  /**
   * Remove permission from a role
   */
  async removePermissionFromRole(
    roleId: string,
    permissionId: string,
  ): Promise<Role | null> {
    const role = await this.roleRepo.findOne({
      where: { id: roleId },
      relations: { permissions: true },
    });
    if (!role) return null;

    role.permissions = role.permissions.filter((p) => p.id !== permissionId);
    return this.roleRepo.save(role);
  }
}
