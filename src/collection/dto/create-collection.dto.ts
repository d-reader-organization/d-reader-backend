import { ApiProperty, PickType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayUnique, IsOptional } from 'class-validator';
import { isEmpty } from 'lodash';
import { Collection } from '../entities/collection.entity';

export class CreateCollectionDto extends PickType(Collection, [
  'name',
  'description',
  'website',
  'twitter',
  'discord',
  'telegram',
  'instagram',
  'medium',
  'tikTok',
  'youTube',
  'magicEden',
  'openSea',
]) {
  @ApiProperty({ type: 'string', format: 'binary', required: true })
  thumbnail: Express.Multer.File;

  @ApiProperty({ type: 'string', format: 'binary', required: true })
  pfp: Express.Multer.File;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  logo: Express.Multer.File | null;

  // TODO v2: revise this later. Possibly it's a bug within swagger-ui
  // @Transform is necessary for ApiProperty to work properly for multipart/form-data with swagger
  @IsOptional()
  @ArrayUnique()
  @Type(() => String)
  @ApiProperty({ type: [String], default: [] })
  @Transform(({ value }) => {
    if (isEmpty(value)) return [];
    else if (typeof value === 'string') {
      return value.split(',');
    } else return value;
  })
  hashlist: string[] = [];
}

export class CreateCollectionFilesDto {
  @ApiProperty({ type: 'string', format: 'binary', required: true })
  thumbnail: Express.Multer.File;

  @ApiProperty({ type: 'string', format: 'binary', required: true })
  pfp: Express.Multer.File;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  logo: Express.Multer.File | null;
}
