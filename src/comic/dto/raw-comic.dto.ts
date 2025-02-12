import { plainToInstance, Type } from 'class-transformer';
import { IsArray, IsDate, IsEnum, IsString, IsUrl } from 'class-validator';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { IsEmptyOrUrl } from 'src/decorators/IsEmptyOrUrl';
import { ComicStatsDto, toComicStatsDto } from './comic-stats.dto';
import { ComicStats } from 'src/comic/dto/types';
import { ApiProperty } from '@nestjs/swagger';
import { getPublicUrl } from 'src/aws/s3client';
import { Comic, Genre, AudienceType } from '@prisma/client';
import {
  PartialGenreDto,
  toPartialGenreDtoArray,
} from 'src/genre/dto/partial-genre.dto';
import { With } from 'src/types/shared';
import { ifDefined } from 'src/utils/lodash';
import { PaginatedResponseDto } from 'src/types/paginated-response.dto';

export class RawComicDto {
  @IsString()
  title: string;

  @IsKebabCase()
  slug: string;

  @IsEnum(AudienceType)
  @ApiProperty({ enum: AudienceType, default: AudienceType.Everyone })
  audienceType: AudienceType;

  @IsDate()
  completedAt: Date;

  @IsDate()
  verifiedAt: Date;

  @IsDate()
  publishedAt: Date;

  @IsDate()
  popularizedAt: Date;

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

  @Type(() => ComicStatsDto)
  stats: ComicStatsDto;

  @IsArray()
  @Type(() => PartialGenreDto)
  genres: PartialGenreDto[];
}

type WithGenres = { genres: Genre[] };
type WithStats = { stats: Partial<ComicStats> };

export type RawComicInput = With<[Comic, WithGenres, WithStats]>;

export function toRawComicDto(comic: RawComicInput) {
  const plainRawComicDto: RawComicDto = {
    title: comic.title,
    slug: comic.slug,
    audienceType: comic.audienceType,
    completedAt: comic.completedAt,
    verifiedAt: comic.verifiedAt,
    publishedAt: comic.publishedAt,
    popularizedAt: comic.popularizedAt,
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
    stats: ifDefined(comic.stats, toComicStatsDto),
    genres: ifDefined(comic.genres, toPartialGenreDtoArray),
  };

  const rawComicDto = plainToInstance(RawComicDto, plainRawComicDto);
  return rawComicDto;
}

export const toRawComicDtoArray = (comics: RawComicInput[]) => {
  return comics.map(toRawComicDto);
};

export type PaginatedRawComicInput = {
  totalItems: number;
  comics: RawComicInput[];
};

export const toPaginatedRawComicDto = (input: PaginatedRawComicInput) => {
  const plainPaginatedRawComicDto: PaginatedResponseDto<RawComicDto> = {
    totalItems: input.totalItems,
    data: toRawComicDtoArray(input.comics),
  };

  const paginatedRawComicDto = plainToInstance(
    PaginatedResponseDto<RawComicDto>,
    plainPaginatedRawComicDto,
  );
  return paginatedRawComicDto;
};
