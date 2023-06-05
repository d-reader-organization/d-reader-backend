import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import {
  CreateComicIssueDto,
  CreateComicIssueFilesDto,
} from './create-comic-issue.dto';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { ComicRarity } from '@prisma/client';

export class StateFulCover {
  @IsString()
  artist: string;

  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  image: Express.Multer.File | null;

  @IsBoolean()
  isSigned: boolean;

  @IsBoolean()
  isUsed: boolean;

  @IsEnum(ComicRarity)
  @ApiProperty({ enum: ComicRarity })
  rarity?: ComicRarity;
}

export class UpdateComicIssueDto extends PartialType(
  OmitType(CreateComicIssueDto, ['comicSlug', 'title', 'slug'] as const),
) {}

export class UpdateComicIssueFilesDto extends PartialType(
  CreateComicIssueFilesDto,
) {
  @IsOptional()
  @IsArray()
  @Type(() => StateFulCover)
  @ApiProperty({ type: [StateFulCover] })
  stateFulCovers?: StateFulCover[];
}
