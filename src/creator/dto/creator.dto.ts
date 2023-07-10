import { plainToInstance, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { CreatorStatsDto } from './creator-stats.dto';
import { CreatorStats } from 'src/comic/types/creator-stats';
import { Creator, Genre } from '@prisma/client';
import { getPublicUrl } from 'src/aws/s3client';
import { IsOptionalUrl } from 'src/decorators/IsOptionalUrl';
import { WalletCreatorStats } from 'src/creator/types/wallet-creator-my-stats.dto';
import { WalletCreatorStatsDto } from './wallet-creator.dto';
import { GenreDto } from 'src/genre/dto/genre.dto';
import { PickType } from '@nestjs/swagger';

export class PartialGenreDto extends PickType(GenreDto, [
  'name',
  'slug',
  'color',
  'icon',
]) {}

export class CreatorDto {
  @IsPositive()
  id: number;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MaxLength(54)
  name: string;

  @IsNotEmpty()
  @IsKebabCase()
  slug: string;

  @IsBoolean()
  isDeleted: boolean;

  @IsBoolean()
  isVerified: boolean;

  @IsUrl()
  avatar: string;

  @IsUrl()
  banner: string;

  @IsUrl()
  logo: string;

  @IsString()
  @MaxLength(256)
  description: string;

  @IsString()
  @MaxLength(128)
  flavorText: string;

  @IsOptionalUrl()
  website: string;

  @IsOptionalUrl()
  twitter: string;

  @IsOptionalUrl()
  instagram: string;

  @IsOptionalUrl()
  lynkfire: string;

  @IsOptional()
  @Type(() => CreatorStatsDto)
  stats?: CreatorStatsDto;

  @IsOptional()
  @Type(() => WalletCreatorStatsDto)
  myStats?: WalletCreatorStatsDto;

  @IsArray()
  @Type(() => PartialGenreDto)
  genres?: PartialGenreDto[];
}

type CreatorInput = Creator & {
  stats?: CreatorStats;
  myStats?: WalletCreatorStats;
  genres?: Genre[];
};

export function toCreatorDto(creator: CreatorInput) {
  const plainCreatorDto: CreatorDto = {
    id: creator.id,
    email: creator.email,
    name: creator.name,
    slug: creator.slug,
    isDeleted: !!creator.deletedAt,
    isVerified: !!creator.verifiedAt,
    avatar: getPublicUrl(creator.avatar),
    banner: getPublicUrl(creator.banner),
    logo: getPublicUrl(creator.logo),
    description: creator.description,
    flavorText: creator.flavorText,
    website: creator.website,
    twitter: creator.twitter,
    instagram: creator.instagram,
    lynkfire: creator.lynkfire,
    stats: creator.stats
      ? {
          comicIssuesCount: creator.stats.comicIssuesCount,
          totalVolume: creator.stats.totalVolume,
          followersCount: creator.stats.followersCount,
        }
      : undefined,
    myStats: creator.myStats
      ? { isFollowing: creator.myStats.isFollowing }
      : undefined,
    genres: creator.genres?.map((genre) => {
      return {
        name: genre.name,
        slug: genre.slug,
        color: genre.color,
        icon: getPublicUrl(genre.icon),
      };
    }),
  };

  const creatorDto = plainToInstance(CreatorDto, plainCreatorDto);
  return creatorDto;
}

export const toCreatorDtoArray = (creators: CreatorInput[]) => {
  return creators.map(toCreatorDto);
};
