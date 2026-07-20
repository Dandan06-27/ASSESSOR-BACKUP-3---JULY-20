import { IsString, IsOptional, IsArray, IsUUID } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  permissionIds?: string[];
}

export class CreatePermissionDto {
  @IsString()
  code: string;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  category?: string;
}

export class AssignRoleDto {
  @IsUUID()
  roleId: string;
}

export class AssignPermissionDto {
  @IsUUID()
  permissionId: string;
}
