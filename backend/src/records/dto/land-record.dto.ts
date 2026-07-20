import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ClassificationCode } from '../../common/enums';

export class CreateLandRecordDto {
  @IsString()
  @IsNotEmpty()
  assessorsLotNo: string;

  @IsString()
  @IsNotEmpty()
  cadastralLotNo: string;

  @IsOptional()
  @IsString()
  tdNo?: string;

  @IsOptional() @IsString() newPin?: string;

  @IsOptional() @IsString() fid?: string;
  @IsOptional() @IsString() pin?: string;
  @IsOptional() @IsString() sectionNo?: string;

  @IsOptional() @IsString() arpA?: string;
  @IsOptional() @IsString() arpB?: string;
  @IsOptional() @IsString() arpC?: string;
  @IsOptional() @IsString() arpD?: string;
  @IsOptional() @IsString() arpE?: string;
  @IsOptional() @IsString() arpF?: string;

  @IsString()
  @IsNotEmpty()
  nameOfOwner: string;

  @IsOptional() @IsString() titleNo?: string;
  @IsOptional() @IsNumber() areaSqm?: number;

  @IsOptional()
  @IsEnum(ClassificationCode)
  classificationCode?: ClassificationCode;

  @IsOptional() @IsNumber() improvement?: number;
  @IsOptional() @IsString() buildingNo?: string;
  @IsOptional() @IsString() mch?: string;
  @IsOptional() @IsString() oth?: string;
  @IsOptional() @IsString() conveyance?: string;
  @IsOptional() @IsString() eff?: string;
  @IsOptional() @IsString() location?: string;

  @IsOptional() @IsString() declarant?: string;

  @IsOptional() @IsString() indexNo?: string;

  @IsString()
  @IsNotEmpty()
  barangay: string;

  @IsOptional() @IsString() remarks?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
}

export class UpdateLandRecordDto extends CreateLandRecordDto {}

export class SearchLandDto {
  @IsOptional() @IsString() assessorsLotNo?: string;
  @IsOptional() @IsString() cadastralLotNo?: string;
  @IsOptional() @IsString() tdNo?: string;
  @IsOptional() @IsString() nameOfOwner?: string;
  @IsOptional() @IsString() indexNo?: string;
  @IsOptional() @IsString() barangay?: string;
  @IsOptional() @IsString() classificationCode?: string;
}
