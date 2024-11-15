import { plainToInstance, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { IsEmptyOrUrl } from 'src/decorators/IsEmptyOrUrl';
import { ComicStatsDto, toComicStatsDto } from './comic-stats.dto';
import { toUserComicDto, UserComicDto, UserComicInput } from './user-comic.dto';
import { ComicStats } from 'src/comic/dto/types';
import { ApiProperty } from '@nestjs/swagger';
import { getPublicUrl } from '../../aws/s3client';
import { Comic, Genre, Creator, AudienceType } from '@prisma/client';
import {
  PartialCreatorDto,
  toPartialCreatorDto,
} from '../../creator/dto/partial-creator.dto';
import {
  PartialGenreDto,
  toPartialGenreDtoArray,
} from '../../genre/dto/partial-genre.dto';
import { With } from 'src/types/shared';

export class ComicDto {
  @IsString()
  title: string;

  @IsKebabCase()
  slug: string;

  @IsEnum(AudienceType)
  @ApiProperty({ enum: AudienceType, default: AudienceType.Everyone })
  audienceType: AudienceType;

  @IsBoolean()
  isCompleted: boolean;

  @IsBoolean()
  isVerified: boolean;

  @IsBoolean()
  isPublished: boolean;

  @IsBoolean()
  isPopular: boolean;

  @IsUrl()
  cover: string;

  @IsUrl()
  banner: string;

  @IsUrl()
  logo: string;

  @IsString()
  description: string;

  @IsString()
  flavorText: string;

  @IsEmptyOrUrl()
  website: string;

  @IsEmptyOrUrl()
  twitter: string;

  @IsEmptyOrUrl()
  discord: string;

  @IsEmptyOrUrl()
  telegram: string;

  @IsEmptyOrUrl()
  instagram: string;

  @IsEmptyOrUrl()
  tikTok: string;

  @IsEmptyOrUrl()
  youTube: string;
}

type WithGenres = { genres: Genre[] };
type WithCreator = { creator: Creator };
type WithStats = { stats: Partial<ComicStats> };
type WithMyStats = { myStats: UserComicInput };

export function toComicDto(comic: Comic): ComicDto {
  const plainComicDto: ComicDto = {
    title: comic.title,
    slug: comic.slug,
    audienceType: comic.audienceType,
    isCompleted: !!comic.completedAt,
    isVerified: !!comic.verifiedAt,
    isPublished: !!comic.publishedAt,
    isPopular: !!comic.popularizedAt,
    cover: getPublicUrl(comic.cover),
    banner: getPublicUrl(comic.banner),
    logo: getPublicUrl(comic.logo),
    description: comic.description,
    flavorText: comic.flavorText,
    website: comic.website,
    twitter: comic.twitter,
    discord: comic.discord,
    telegram: comic.telegram,
    instagram: comic.instagram,
    tikTok: comic.tikTok,
    youTube: comic.youTube,
  };

  const comicDto = plainToInstance(ComicDto, plainComicDto);
  return comicDto;
}

export const toComicDtoArray = (comics: Comic[]) => {
  return comics.map(toComicDto);
};

/** Detailed Comic DTO */
export class DetailedComicDto extends ComicDto {
  @IsArray()
  @Type(() => PartialGenreDto)
  genres: PartialGenreDto[];

  @Type(() => PartialCreatorDto)
  creator: PartialCreatorDto;

  @IsOptional()
  @Type(() => ComicStatsDto)
  stats: ComicStatsDto;

  @IsOptional()
  @Type(() => UserComicDto)
  myStats: UserComicDto;
}

export type DetailedComicInput = With<
  [Comic, WithGenres, WithCreator, WithStats, WithMyStats]
>;

export function toDetailedComicDto(
  comic: DetailedComicInput,
): DetailedComicDto {
  return {
    ...toComicDto(comic),
    genres: toPartialGenreDtoArray(comic.genres),
    stats: toComicStatsDto(comic.stats),
    creator: toPartialCreatorDto(comic.creator),
    myStats: toUserComicDto(comic.myStats),
  };
}

export const toDetailedComicDtoArray = (comics: DetailedComicInput[]) => {
  return comics.map(toDetailedComicDto);
};

/** Owned Comic DTO */
export class OwnedComicDto extends ComicDto {
  @Type(() => PartialCreatorDto)
  creator: PartialCreatorDto;

  @IsOptional()
  @Type(() => ComicStatsDto)
  stats: ComicStatsDto;

  @IsOptional()
  @Type(() => UserComicDto)
  myStats: UserComicDto;
}

export type OwnedComicInput = With<
  [Comic, WithCreator, WithStats, WithMyStats]
>;

export function toOwnedComicDto(comic: OwnedComicInput): OwnedComicDto {
  return {
    ...toComicDto(comic),
    stats: toComicStatsDto(comic.stats),
    creator: toPartialCreatorDto(comic.creator),
    myStats: toUserComicDto(comic.myStats),
  };
}

export const toOwnedComicDtoArray = (comics: OwnedComicInput[]) => {
  return comics.map(toOwnedComicDto);
};
