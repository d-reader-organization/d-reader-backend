import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ComicRarity, StatelessCover } from '@prisma/client';
import { getPublicUrl } from '../../../aws/s3client';
import { plainToInstance } from 'class-transformer';
import { orderBy } from 'lodash';

export class StatelessCoverDto {
  @IsString()
  artist: string;

  @IsOptional()
  @IsEnum(ComicRarity)
  @ApiProperty({ enum: ComicRarity })
  rarity?: ComicRarity;

  @IsOptional()
  @IsInt()
  share: number;

  @IsBoolean()
  isDefault: boolean;

  @IsUrl()
  // @Transform(transformToUrl, { toClassOnly: true })
  image: string;
}

export function toStatelessCoverDto(cover: StatelessCover) {
  const plainStatelessCoverDto: StatelessCoverDto = {
    artist: cover.artist,
    rarity: cover.rarity,
    share: cover.share,
    isDefault: cover.isDefault,
    image: getPublicUrl(cover.image),
  };

  const coverDto = plainToInstance(StatelessCoverDto, plainStatelessCoverDto);
  return coverDto;
}

export const toStatelessCoverDtoArray = (covers: StatelessCover[]) => {
  const sortedCovers = orderBy(covers, 'share', 'desc');
  return sortedCovers.map(toStatelessCoverDto);
};
