import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ComicRarity, StatelessCover } from '@prisma/client';
import { Transform, plainToInstance } from 'class-transformer';
import { transformToUrl } from '../../../aws/s3client';

export class StatelessCoverDto {
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

  @IsString()
  // TODO v1: check if this is working, if yes, apply everywhere
  @Transform(transformToUrl, { toClassOnly: true })
  image: string;
}

export function toStatelessCoverDto(cover: StatelessCover) {
  return plainToInstance(StatelessCoverDto, cover);
}

export const toStatelessCoverDtoArray = (covers: StatelessCover[]) => {
  return covers.map(toStatelessCoverDto);
};
