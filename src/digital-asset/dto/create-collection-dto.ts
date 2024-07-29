import { Transform } from 'class-transformer';
import { BaseMetadataDto, BaseMetadataFilesDto } from './base-metadata.dto';
import { ApiProperty, IntersectionType } from '@nestjs/swagger';

export class CreateCollectionBodyDto extends BaseMetadataDto {}

export class CreateCollectionFilesDto extends BaseMetadataFilesDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  cover?: Express.Multer.File | null;
}

export class CreateCollectionDto extends IntersectionType(
  CreateCollectionBodyDto,
  CreateCollectionFilesDto,
) {}
