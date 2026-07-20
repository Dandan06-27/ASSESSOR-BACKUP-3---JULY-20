import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../common/enums';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  divisionId?: string;

  @IsOptional()
  @IsString()
  contactNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  bio?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class AssignRoleDto {
  @IsIn([UserRole.USER, UserRole.ADMIN, UserRole.ASSISTANT_ADMIN])
  role: UserRole;

  @IsString()
  @IsNotEmpty()
  adminSecretKey: string;

  @IsOptional()
  @IsString()
  divisionId?: string;
}

export class ApproveUserDto {
  @IsOptional()
  approve?: boolean;
}
