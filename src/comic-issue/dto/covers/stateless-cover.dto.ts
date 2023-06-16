import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ComicRarity, StatelessCover } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { getPublicUrl } from '../../../aws/s3client';

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

  // TODO: we don't need manual mapping anymore now that we don't have async getReadUrl()
  const issueDto = plainToInstance(StatelessCoverDto, plainStatelessCoverDto);
  return issueDto;
}

export const toStatelessCoverDtoArray = (covers: StatelessCover[]) => {
  return covers.map(toStatelessCoverDto);
};
