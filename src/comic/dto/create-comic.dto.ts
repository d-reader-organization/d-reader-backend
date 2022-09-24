import { ApiProperty, IntersectionType, PickType } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';
import { kebabCase } from 'lodash';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { ComicDto } from './comic.dto';

export class CreateComicDto extends PickType(ComicDto, [
  'name',
  'description',
  'flavorText',
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
  @Expose()
  @IsKebabCase()
  @Transform(({ obj }) => kebabCase(obj.name))
  @ApiProperty({ readOnly: true, required: false })
  slug: string;
}

export class CreateComicFilesDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  @IsOptional()
  thumbnail?: Express.Multer.File | null;

  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  @IsOptional()
  pfp?: Express.Multer.File | null;

  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  @IsOptional()
  logo?: Express.Multer.File | null;
}

export class CreateComicSwaggerDto extends IntersectionType(
  CreateComicDto,
  CreateComicFilesDto,
) {}
