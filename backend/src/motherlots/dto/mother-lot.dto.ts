import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMotherLotDto {
  @IsString()
  @IsNotEmpty()
  lotNumber: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  barangay: string;

  @IsString()
  @IsNotEmpty()
  section: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class UpdateMotherLotDto {
  @IsOptional()
  @IsString()
  lotNumber?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  barangay?: string;

  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
