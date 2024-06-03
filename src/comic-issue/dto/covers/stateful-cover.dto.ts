import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ComicRarity, StatefulCover } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { getPublicUrl } from '../../../aws/s3client';

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

  @IsUrl()
  // @Transform(transformToUrl, { toClassOnly: true })
  image: string;
}

export function toStatefulCoverDto(cover: StatefulCover) {
  const plainStatefulCoverDto: StatefulCoverDto = {
    artist: cover.artist,
    rarity: cover.rarity,
    isSigned: cover.isSigned,
    isUsed: cover.isUsed,
    image: getPublicUrl(cover.image),
  };

  const coverDto = plainToInstance(StatefulCoverDto, plainStatefulCoverDto);
  return coverDto;
}

export const toStatefulCoverDtoArray = (covers: StatefulCover[]) => {
  return covers.map(toStatefulCoverDto);
};
