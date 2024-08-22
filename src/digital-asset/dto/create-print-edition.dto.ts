import { IntersectionType } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';
import { BaseMetadataDto, BaseMetadataFilesDto } from './base-metadata.dto';

export class CreatePrintEditionCollectionBodyDto extends BaseMetadataDto {
  @IsNumber()
  supply: number;

  @IsOptional()
  @IsBoolean()
  isNSFW?: boolean;
}

export class CreatePrintEditionCollectionDto extends IntersectionType(
  CreatePrintEditionCollectionBodyDto,
  BaseMetadataFilesDto,
) {}
