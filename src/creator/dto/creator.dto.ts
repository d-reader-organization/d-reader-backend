import { plainToInstance, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { CreatorStatsDto, toCreatorStatsDto } from './creator-stats.dto';
import { CreatorStats } from 'src/comic/dto/types';
import { CreatorChannel, Genre } from '@prisma/client';
import { getPublicUrl } from 'src/aws/s3client';
import { IsOptionalUrl } from 'src/decorators/IsOptionalUrl';
import { UserCreatorMyStatsDto } from 'src/creator/dto/types';
import { UserCreatorStatsDto } from './user-creator.dto';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';
import { IsOptionalString } from 'src/decorators/IsOptionalString';
import { PartialGenreDto } from 'src/genre/dto/partial-genre.dto';
import { ifDefined } from 'src/utils/lodash';
import { DISPLAY_NAME_MAX_SIZE } from 'src/constants';

export class CreatorChannelDto {
  @IsPositive()
  id: number;

  @IsNotEmpty()
  @MaxLength(54)
  handle: string;

  @IsNotEmpty()
  @MaxLength(DISPLAY_NAME_MAX_SIZE)
  displayName: string;

  @IsBoolean()
  isVerified: boolean;

  @IsUrl()
  avatar: string;

  @IsUrl()
  banner: string;

  @IsString()
  @MaxLength(512)
  description: string;

  @IsSolanaAddress()
  @IsOptionalString()
  tippingAddress: string;

  @IsOptionalUrl()
  website: string;

  @IsOptionalUrl()
  twitter: string;

  @IsOptionalUrl()
  instagram: string;

  @IsOptionalUrl()
  linktree: string;

  @IsOptional()
  @Type(() => CreatorStatsDto)
  stats?: CreatorStatsDto;

  @IsOptional()
  @Type(() => UserCreatorStatsDto)
  myStats?: UserCreatorStatsDto;

  @IsArray()
  @Type(() => PartialGenreDto)
  genres?: PartialGenreDto[];
}

export type CreatorInput = CreatorChannel & {
  stats?: CreatorStats;
  myStats?: UserCreatorMyStatsDto;
  genres?: Genre[];
};

export function toCreatorDto(creator: CreatorInput) {
  const plainCreatorDto: CreatorChannelDto = {
    id: creator.id,
    handle: creator.handle,
    displayName: creator.displayName,
    isVerified: !!creator.verifiedAt,
    avatar: getPublicUrl(creator.avatar),
    banner: getPublicUrl(creator.banner),
    description: creator.description,
    tippingAddress: creator.tippingAddress,
    website: creator.website,
    twitter: creator.twitter,
    instagram: creator.instagram,
    linktree: creator.linktree,
    stats: ifDefined(creator.stats, toCreatorStatsDto),
    myStats: creator.myStats
      ? { isFollowing: creator.myStats.isFollowing }
      : undefined,
  };

  const creatorDto = plainToInstance(CreatorChannelDto, plainCreatorDto);
  return creatorDto;
}

export const toCreatorDtoArray = (creators: CreatorInput[]) => {
  return creators.map(toCreatorDto);
};
