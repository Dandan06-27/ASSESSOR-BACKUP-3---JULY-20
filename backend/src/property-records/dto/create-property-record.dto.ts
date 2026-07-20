import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreatePropertyRecordDto {
  @IsOptional()
  @IsString()
  barangay?: string;

  @IsOptional()
  @IsString()
  lotNumber?: string;

  @IsOptional()
  @IsString()
  arpNumber?: string;

  @IsOptional()
  @IsString()
  titleNumber?: string;

  @IsOptional()
  @IsString()
  referencePoint?: string;

  @IsOptional()
  tieLine?: {
    distance?: string;
    degrees?: string;
    minutes?: string;
  };

  @IsOptional()
  @IsArray()
  technicalDescription?: Array<{
    distance?: string;
    degrees?: string;
    minutes?: string;
  }>;
}

export class SearchPropertyRecordDto {
  @IsOptional()
  @IsString()
  q?: string;
}
