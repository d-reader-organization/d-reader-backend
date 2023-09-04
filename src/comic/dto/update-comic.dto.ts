import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { CreateComicDto } from './create-comic.dto';
import { Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';

export class UpdateComicDto extends PartialType(
  OmitType(CreateComicDto, ['title', 'slug'] as const),
) {}

export class UpdateComicFilesDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  @IsOptional()
  cover?: Express.Multer.File | null;

  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  @IsOptional()
  banner?: Express.Multer.File | null;

  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  @IsOptional()
  pfp?: Express.Multer.File | null;

  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  @IsOptional()
  logo?: Express.Multer.File | null;
}
