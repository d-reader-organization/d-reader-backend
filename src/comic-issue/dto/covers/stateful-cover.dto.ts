import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ComicRarity } from '@prisma/client';

export class StatefulCoverDto {
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

  @IsString()
  image: string;
}

// TODO: toStatefulCoverDto
