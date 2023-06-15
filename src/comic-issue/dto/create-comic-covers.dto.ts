import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { ComicRarity } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreateStatelessCoverBodyDto {
  @IsString()
  artist: string;

  @IsEnum(ComicRarity)
  @ApiProperty({ enum: ComicRarity })
  rarity: ComicRarity;

  @IsOptional()
  @IsInt()
  share: number;

  @IsBoolean()
  isDefault: boolean;
}

export class CoverDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  cover: Express.Multer.File | null;
}

export class CreateStatefulCoverBodyDto {
  @IsString()
  artist: string;

  @IsBoolean()
  isSigned: boolean;

  @IsBoolean()
  isUsed: boolean;

  @IsOptional()
  @IsEnum(ComicRarity)
  @ApiProperty({ enum: ComicRarity })
  rarity?: ComicRarity;
}

export class CreateStatefulCoverDto extends IntersectionType(
  CreateStatefulCoverBodyDto,
  CoverDto,
) {}

export class CreateStatelessCoverDto extends IntersectionType(
  CreateStatelessCoverBodyDto,
  CoverDto,
) {}
