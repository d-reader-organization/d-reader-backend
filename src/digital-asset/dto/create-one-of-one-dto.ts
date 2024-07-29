import { IntersectionType } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { BaseMetadataDto, BaseMetadataFilesDto } from './base-metadata.dto';

export class CreateOneOfOneBodyDto extends BaseMetadataDto {
  @IsOptional()
  @IsNumber()
  supply?: number;

  @IsOptional()
  @IsString()
  collectionAddress?: string;

  @IsBoolean()
  isNSFW: boolean;
}

export class CreateOneOfOneDto extends IntersectionType(
  CreateOneOfOneBodyDto,
  BaseMetadataFilesDto,
) {}
