# RBAC (Role-Based Access Control) Implementation Guide

## Overview
This document describes the comprehensive RBAC system implementation for the Land Bookkeeping Management System. The system provides fine-grained access control through roles and permissions.

## Architecture

### Database Schema

#### Entities

1. **Role Entity** (`src/entities/role.entity.ts`)
   - Represents a collection of permissions
   - Many-to-many relationship with User and Permission entities
   - Fields: id, name, description, permissions, users, createdAt, updatedAt

2. **Permission Entity** (`src/entities/permission.entity.ts`)
   - Represents an atomic permission/action
   - Many-to-many relationship with Role entity
   - Fields: id, code, description, category, roles, createdAt, updatedAt

3. **User Entity** (updated)
   - Now includes many-to-many relationship with Role
   - Maintains backward compatibility with existing UserRole enum

#### Database Tables

- `roles` - Stores all available roles
- `permissions` - Stores all available permissions
- `user_roles` - Junction table for user-role relationships
- `role_permissions` - Junction table for role-permission relationships

### Roles and Permissions

#### Predefined Roles

1. **SuperAdmin**
   - All permissions
   - Can manage all aspects of the system

2. **Admin**
   - Access Dashboard
   - Access Records
   - Access View Land
   - Access Add Record
   - Can Print Certificate
   - Add and Delete Records
   - Cannot: access administration, assign roles, create accounts, access org chart

3. **User**
   - Access Dashboard only

#### Permission Codes

| Code | Description | Category |
|------|-------------|----------|
| access_dashboard | Access Dashboard | dashboard |
| access_records | Access Records | records |
| access_view_land | Access View Land | land |
| access_add_record | Access Add Record | records |
| access_administration | Access Administration | admin |
| can_print_certificate | Can Print Certificate | documents |
| add_and_delete_records | Add and Delete Records | records |
| assign_roles | Assign Roles | admin |
| create_account | Create Account | admin |
| access_org_chart | Access Org Chart | org |

## Implementation Components

### 1. RBAC Service (`src/rbac/rbac.service.ts`)

Main service for managing roles, permissions, and access control.

**Key Methods:**

- `hasPermission(userId, permissionCode)` - Check single permission
- `hasAllPermissions(userId, codes)` - Check multiple permissions (AND)
- `hasAnyPermission(userId, codes)` - Check multiple permissions (OR)
- `getUserPermissions(userId)` - Get all permissions for a user
- `getUserRoles(userId)` - Get all roles for a user
- `assignRoleToUser(userId, roleId)` - Add role to user
- `removeRoleFromUser(userId, roleId)` - Remove role from user
- `getAllRoles()` - Get all available roles
- `getAllPermissions()` - Get all available permissions
- `createRole(name, description, permissionIds)` - Create new role
- `createPermission(code, description, category)` - Create new permission
- `addPermissionToRole(roleId, permissionId)` - Add permission to role
- `removePermissionFromRole(roleId, permissionId)` - Remove permission from role

### 2. RBAC Controller (`src/rbac/rbac.controller.ts`)

REST API endpoints for managing RBAC (protected with role guards).

**Endpoints:**

```
GET  /rbac/roles                              - List all roles
POST /rbac/roles                              - Create new role
GET  /rbac/permissions                        - List all permissions
POST /rbac/permissions                        - Create new permission
GET  /rbac/users/:userId/roles               - Get user's roles
GET  /rbac/users/:userId/permissions         - Get user's permissions
POST /rbac/users/:userId/roles/:roleId       - Assign role to user
DELETE /rbac/users/:userId/roles/:roleId     - Remove role from user
POST /rbac/roles/:roleId/permissions/:permissionId - Add permission to role
DELETE /rbac/roles/:roleId/permissions/:permissionId - Remove permission from role
```

### 3. Guards and Decorators

#### Permission Decorator (`src/common/decorators/permissions.decorator.ts`)

```typescript
@Permissions('permission_code1', 'permission_code2')
async someMethod() {}
```

#### Permissions Guard (`src/common/guards/permissions.guard.ts`)

Checks if user has required permissions before executing route handler.

**Usage in Controllers:**

```typescript
@Controller('example')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ExampleController {
  @Get('protected')
  @Permissions('access_records')
  getRecords() {}
}
```

### 4. Seed Data (`src/seed/seed.service.ts`)

Automatically seeds the following on application startup:

1. **All 10 Permissions** - Creates permission records in database
2. **3 Default Roles** - Creates SuperAdmin, Admin, and User roles with appropriate permissions
3. **Super Admin User** - Creates initial super admin account
4. **Divisions** - Creates organizational divisions

## Usage Examples

### Example 1: Checking Permissions in a Service

```typescript
import { RbacService } from '../rbac/rbac.service';

@Injectable()
export class RecordsService {
  constructor(private rbacService: RbacService) {}

  async createRecord(userId: string, data: any) {
    const hasPermission = await this.rbacService.hasPermission(
      userId,
      'access_add_record'
    );
    
    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to add records');
    }
    
    // Create record...
  }
}
```

### Example 2: Using Permission Decorator on Routes

```typescript
@Controller('records')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class RecordsController {
  @Post()
  @Permissions('access_add_record')
  createRecord(@Body() dto: CreateRecordDto) {
    // Add record logic
  }

  @Delete(':id')
  @Permissions('add_and_delete_records')
  deleteRecord(@Param('id') id: string) {
    // Delete record logic
  }
}
```

### Example 3: Multiple Permission Checks

```typescript
// Check if user has ALL permissions
const hasAll = await this.rbacService.hasAllPermissions(userId, [
  'access_records',
  'can_print_certificate'
]);

// Check if user has ANY permission
const hasAny = await this.rbacService.hasAnyPermission(userId, [
  'access_administration',
  'create_account'
]);
```

### Example 4: Assigning Roles to Users

```typescript
// Assign a role
await this.rbacService.assignRoleToUser(userId, roleId);

// Get all permissions for a user
const permissions = await this.rbacService.getUserPermissions(userId);

// Remove a role
await this.rbacService.removeRoleFromUser(userId, roleId);
```

## Integration with Existing Code

### Backward Compatibility

The new RBAC system maintains backward compatibility with the existing `UserRole` enum:

- Existing code using `@Roles(UserRole.SUPER_ADMIN)` continues to work
- The `role` column in the users table is preserved
- Migration is gradual - you can use both systems simultaneously

### Migration Path

1. **Phase 1** (Current): RBAC system running alongside existing roles
2. **Phase 2**: Gradually migrate route handlers to use permission decorators
3. **Phase 3**: Update frontend to query permissions from RBAC service
4. **Phase 4**: Optional - deprecate UserRole enum after full migration

### Updating Existing Routes

**Before (using UserRole):**
```typescript
@Get('admin/users')
@Roles(UserRole.SUPER_ADMIN, UserRole.ASSISTANT_ADMIN)
async getUsers() {}
```

**After (using Permissions):**
```typescript
@Get('admin/users')
@Permissions('access_administration')
async getUsers() {}
```

## API Response Examples

### Get User Permissions
```json
GET /api/rbac/users/user-123/permissions

[
  {
    "id": "perm-1",
    "code": "access_dashboard",
    "description": "Access Dashboard",
    "category": "dashboard"
  },
  {
    "id": "perm-2",
    "code": "access_records",
    "description": "Access Records",
    "category": "records"
  }
]
```

### Get User Roles
```json
GET /api/rbac/users/user-123/roles

[
  {
    "id": "role-1",
    "name": "Admin",
    "description": "Administrator with record management",
    "permissions": [/* permission objects */]
  }
]
```

### Assign Role to User
```json
POST /api/rbac/users/user-123/roles/role-1

{
  "message": "Role assigned successfully"
}
```

## Configuration

### Environment Variables

Optional configuration in `.env`:

```
# RBAC default configuration (uses database seeding)
# No additional env vars needed - configured via database
```

### Module Registration

The RBAC module is automatically registered in `app.module.ts`:

```typescript
import { RbacModule } from './rbac/rbac.module';

@Module({
  imports: [
    // ... other imports
    RbacModule,
  ],
})
export class AppModule {}
```

## Security Considerations

1. **Permission Checks**: Always verify permissions before sensitive operations
2. **Guard Composition**: Use multiple guards for comprehensive security
3. **Audit Logging**: Consider logging permission checks for security audits
4. **Least Privilege**: Assign minimum required permissions to roles
5. **Regular Review**: Periodically review role-permission mappings

## Testing

### Testing Permission Checks

```typescript
describe('RBAC Service', () => {
  it('should check user permissions', async () => {
    const hasPermission = await rbacService.hasPermission(
      userId,
      'access_records'
    );
    expect(hasPermission).toBe(true);
  });

  it('should deny permission for unauthorized user', async () => {
    const hasPermission = await rbacService.hasPermission(
      unauthorizedUserId,
      'access_administration'
    );
    expect(hasPermission).toBe(false);
  });
});
```

## Troubleshooting

### Issue: "Insufficient permissions" error

**Solution**: Verify that:
1. User has been assigned the appropriate role
2. Role has the required permission
3. Permission code is spelled correctly (case-sensitive)
4. Guard is properly applied to the route

### Issue: Permissions not loading for user

**Solution**: 
1. Check that roles are loaded with `eager: true` on User entity
2. Verify database connections
3. Check database seeding was successful

### Issue: New permissions not appearing

**Solution**:
1. Manually insert permission into database if seeding didn't work
2. Or restart the application to trigger seeding
3. Verify permission code matches exactly

## Future Enhancements

Potential improvements for the RBAC system:

1. **Dynamic Permission Groups** - Group related permissions
2. **Time-based Permissions** - Permissions valid for specific periods
3. **Resource-level Permissions** - Fine-grained resource access control
4. **Permission Inheritance** - Permissions inherited from parent roles
5. **Audit Trail** - Complete history of permission changes
6. **UI for Permission Management** - Frontend dashboard for managing RBAC

## Files Modified/Created

- `src/entities/role.entity.ts` (NEW)
- `src/entities/permission.entity.ts` (NEW)
- `src/entities/user.entity.ts` (MODIFIED - added roles relationship)
- `src/rbac/rbac.service.ts` (NEW)
- `src/rbac/rbac.module.ts` (NEW)
- `src/rbac/rbac.controller.ts` (NEW)
- `src/rbac/dto/rbac.dto.ts` (NEW)
- `src/common/decorators/permissions.decorator.ts` (NEW)
- `src/common/guards/permissions.guard.ts` (NEW)
- `src/seed/seed.service.ts` (MODIFIED - added RBAC seeding)
- `src/seed/seed.module.ts` (MODIFIED - added RBAC repositories)
- `src/app.module.ts` (MODIFIED - added entities and RbacModule)
