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
import { ifDefined } from '../../utils/lodash';

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

  @IsArray()
  @Type(() => PartialGenreDto)
  genres?: PartialGenreDto[];

  @Type(() => PartialCreatorDto)
  creator?: PartialCreatorDto;

  @IsOptional()
  @Type(() => ComicStatsDto)
  stats?: ComicStatsDto;

  @IsOptional()
  @Type(() => UserComicDto)
  myStats?: UserComicDto;
}

type WithGenres = { genres?: Genre[] };
type WithCreator = { creator?: Creator };
type WithStats = { stats?: Partial<ComicStats> };
type WithMyStats = { myStats?: UserComicInput };

export type ComicInput = With<
  [Comic, WithGenres, WithCreator, WithStats, WithMyStats]
>;

export function toComicDto(comic: ComicInput) {
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
    genres: ifDefined(comic.genres, toPartialGenreDtoArray),
    stats: ifDefined(comic.stats, toComicStatsDto),
    creator: ifDefined(comic.creator, toPartialCreatorDto),
    myStats: ifDefined(comic.myStats, toUserComicDto),
  };

  const comicDto = plainToInstance(ComicDto, plainComicDto);
  return comicDto;
}

export const toComicDtoArray = (comics: ComicInput[]) => {
  return comics.map(toComicDto);
};
