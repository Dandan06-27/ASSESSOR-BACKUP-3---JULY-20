# RBAC Quick Start Guide

## Setup Your Controller to Use RBAC

### 1. Basic Setup with Permission Guard

```typescript
import { Controller, UseGuards, Get, Post, Body, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { RbacService } from '../rbac/rbac.service';

@Controller('your-resource')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class YourResourceController {
  constructor(private rbacService: RbacService) {}

  @Get()
  @Permissions('permission_code')
  async getResource() {
    // Your logic here
  }
}
```

### 2. Available Permission Codes

Use these permission codes with the `@Permissions()` decorator:

- `access_dashboard` - Access Dashboard
- `access_records` - Access Records
- `access_view_land` - Access View Land
- `access_add_record` - Access Add Record
- `access_administration` - Access Administration
- `can_print_certificate` - Can Print Certificate
- `add_and_delete_records` - Add and Delete Records
- `assign_roles` - Assign Roles
- `create_account` - Create Account
- `access_org_chart` - Access Org Chart

### 3. Usage Examples

#### Single Permission Check
```typescript
@Post()
@Permissions('access_add_record')
async create(@Body() dto: CreateDto) {
  // Only users with 'access_add_record' permission can access
}
```

#### Multiple Permissions (User needs ANY of these)
```typescript
@Delete(':id')
@Permissions('add_and_delete_records', 'access_administration')
async delete(@Param('id') id: string) {
  // User must have either permission
}
```

### 4. Check Permissions Programmatically

```typescript
import { ForbiddenException } from '@nestjs/common';

async someMethod(@Req() req: Request) {
  const userId = req.user.sub; // From JWT token
  
  // Check single permission
  const can = await this.rbacService.hasPermission(
    userId,
    'access_records'
  );
  
  if (!can) {
    throw new ForbiddenException('You lack required permissions');
  }
  
  // Check multiple permissions (AND)
  const canDo = await this.rbacService.hasAllPermissions(userId, [
    'access_records',
    'can_print_certificate'
  ]);
  
  // Check multiple permissions (OR)
  const canEither = await this.rbacService.hasAnyPermission(userId, [
    'access_administration',
    'assign_roles'
  ]);
}
```

### 5. Get User's Permissions

```typescript
async checkMyPermissions(@Req() req: Request) {
  const userId = req.user.sub;
  const permissions = await this.rbacService.getUserPermissions(userId);
  return permissions;
}
```

### 6. Get User's Roles

```typescript
async checkMyRoles(@Req() req: Request) {
  const userId = req.user.sub;
  const roles = await this.rbacService.getUserRoles(userId);
  return roles;
}
```

## Default Roles & Permissions

### SuperAdmin
- **All Permissions**
- Can do everything in the system

### Admin
- access_dashboard ✓
- access_records ✓
- access_view_land ✓
- access_add_record ✓
- can_print_certificate ✓
- add_and_delete_records ✓
- access_administration ✗
- assign_roles ✗
- create_account ✗
- access_org_chart ✗

### User
- access_dashboard ✓

## Integration with Existing Roles

The system still supports the old `@Roles()` decorator:

```typescript
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { RolesGuard } from '../common/guards/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Get()
@Roles(UserRole.SUPER_ADMIN, UserRole.ASSISTANT_ADMIN)
async oldStyleRoute() {
  // Old role-based access control
}
```

**Recommendation**: Use `@Permissions()` for new features - it's more flexible.

## Troubleshooting

### "Cannot find PermissionsGuard"
Make sure you've imported it:
```typescript
import { PermissionsGuard } from '../common/guards/permissions.guard';
```

### "Insufficient permissions" error
1. Verify the user has the required role
2. Verify the role has the required permission
3. Check the permission code spelling (case-sensitive)
4. Use RBAC endpoints to assign roles: `POST /api/rbac/users/{userId}/roles/{roleId}`

### User permission not updating immediately
The User entity loads roles with `eager: true`, so roles should load automatically. If not:
1. Restart the backend service
2. Check database connections
3. Verify role was properly assigned in database

## API Examples

### Assign a role to a user
```bash
POST /api/rbac/users/user-id/roles/role-id

Response: { "message": "Role assigned successfully" }
```

### Remove a role from a user
```bash
DELETE /api/rbac/users/user-id/roles/role-id

Response: { "message": "Role removed successfully" }
```

### Get all permissions
```bash
GET /api/rbac/permissions

Response: [
  {
    "id": "perm-1",
    "code": "access_dashboard",
    "description": "Access Dashboard",
    "category": "dashboard"
  },
  ...
]
```

### Get user permissions
```bash
GET /api/rbac/users/user-id/permissions

Response: [
  {
    "id": "perm-1",
    "code": "access_dashboard",
    ...
  },
  ...
]
```

### Get all roles
```bash
GET /api/rbac/roles

Response: [
  {
    "id": "role-1",
    "name": "SuperAdmin",
    "description": "Super Administrator",
    "permissions": [...]
  },
  ...
]
```
