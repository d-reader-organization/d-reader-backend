import { IntersectionType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { BaseMetadataDto, BaseMetadataFilesDto } from './base-metadata.dto';

export class CreateOneOfOneBodyDto extends BaseMetadataDto {
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
