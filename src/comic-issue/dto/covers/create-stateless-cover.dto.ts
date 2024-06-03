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
import { TransformStringToBoolean } from 'src/utils/transform';

export class CreateStatelessCoverBodyDto {
  @IsString()
  artist: string;

  @IsString()
  @IsOptional()
  artistTwitterHandle?: string;

  @IsEnum(ComicRarity)
  @ApiProperty({ enum: ComicRarity })
  rarity: ComicRarity;

  @IsOptional()
  @IsInt()
  share: number;

  @IsBoolean()
  @TransformStringToBoolean()
  isDefault: boolean;
}

export class CreateStatelessCoverFilesDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  image: Express.Multer.File | null;
}

export class CreateStatelessCoverDto extends IntersectionType(
  CreateStatelessCoverBodyDto,
  CreateStatelessCoverFilesDto,
) {}
