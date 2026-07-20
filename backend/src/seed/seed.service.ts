import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { UserRole, UserStatus } from '../common/enums';
import { Division } from '../entities/division.entity';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Division)
    private readonly divisionRepo: Repository<Division>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
  ) {}

  async onModuleInit() {
    await this.seedPermissions();
    await this.seedRoles();
    await this.seedDivisions();
    await this.seedSuperAdmin();
  }

  private async seedPermissions() {
    const permissions = [
      {
        code: 'access_dashboard',
        description: 'Access Dashboard',
        category: 'dashboard',
      },
      {
        code: 'access_records',
        description: 'Access Records',
        category: 'records',
      },
      {
        code: 'access_view_land',
        description: 'Access View Land',
        category: 'land',
      },
      {
        code: 'access_add_record',
        description: 'Access Add Record',
        category: 'records',
      },
      {
        code: 'access_administration',
        description: 'Access Administration',
        category: 'admin',
      },
      {
        code: 'can_print_certificate',
        description: 'Can Print Certificate',
        category: 'documents',
      },
      {
        code: 'add_and_delete_records',
        description: 'Add and Delete Records',
        category: 'records',
      },
      {
        code: 'assign_roles',
        description: 'Assign Roles',
        category: 'admin',
      },
      {
        code: 'create_account',
        description: 'Create Account',
        category: 'admin',
      },
      {
        code: 'access_org_chart',
        description: 'Access Org Chart',
        category: 'org',
      },
    ];

    for (const permData of permissions) {
      const exists = await this.permissionRepo.findOne({
        where: { code: permData.code },
      });
      if (!exists) {
        await this.permissionRepo.save(
          this.permissionRepo.create(permData),
        );
      }
    }
  }

  private async seedRoles() {
    const permissions = await this.permissionRepo.find();

    // SuperAdmin permissions (all permissions)
    const superAdminPerms = permissions;

    // Admin permissions (all except: access_administration, assign_roles, create_account, access_org_chart)
    const adminPerms = permissions.filter((p) =>
      ![
        'access_administration',
        'assign_roles',
        'create_account',
        'access_org_chart',
      ].includes(p.code),
    );

    // User permissions (only access_dashboard)
    const userPerms = permissions.filter((p) => p.code === 'access_dashboard');

    const roles = [
      {
        name: 'SuperAdmin',
        description: 'Super Administrator with full access',
        permissions: superAdminPerms,
      },
      {
        name: 'Admin',
        description: 'Administrator with record management',
        permissions: adminPerms,
      },
      {
        name: 'User',
        description: 'Regular user with limited access',
        permissions: userPerms,
      },
    ];

    for (const roleData of roles) {
      const exists = await this.roleRepo.findOne({
        where: { name: roleData.name },
      });
      if (!exists) {
        const role = this.roleRepo.create({
          name: roleData.name,
          description: roleData.description,
          permissions: roleData.permissions,
        });
        await this.roleRepo.save(role);
      }
    }
  }

  private async seedDivisions() {
    const divisions = [
      'Assessment Division',
      'Records Division',
      'GIS Mapping Division',
      'Client Services Division',
    ];

    for (const name of divisions) {
      const exists = await this.divisionRepo.findOne({ where: { name } });
      if (!exists) {
        await this.divisionRepo.save(this.divisionRepo.create({ name }));
      }
    }
  }

  private async seedSuperAdmin() {
    const email = this.config.get('SUPER_ADMIN_EMAIL', 'superadmin@gov.ph');
    const existing = await this.userRepo.findOne({ where: { email } });
    if (!existing) {
      const firstDiv = await this.divisionRepo.findOne({
        where: {},
        order: { createdAt: 'ASC' },
      });

      const superAdminRole = await this.roleRepo.findOne({
        where: { name: 'SuperAdmin' },
      });

      const user = this.userRepo.create({
        email,
        password: await bcrypt.hash(
          this.config.get('SUPER_ADMIN_PASSWORD', 'SuperAdmin@2026'),
          10,
        ),
        fullName: 'Super Administrator',
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        position: 'Super Admin',
        divisionId: firstDiv?.id ?? null,
        roles: superAdminRole ? [superAdminRole] : [],
      });

      await this.userRepo.save(user);
    }
  }
}
