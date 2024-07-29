import { IntersectionType } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';
import { BaseMetadataDto, BaseMetadataFilesDto } from './base-metadata.dto';

export class CreateMasterEditionBodyDto extends BaseMetadataDto {
  @IsOptional()
  @IsNumber()
  supply?: number;

  @IsBoolean()
  isNSFW: boolean;
}

export class CreateMasterEditionDto extends IntersectionType(
  CreateMasterEditionBodyDto,
  BaseMetadataFilesDto,
) {}
