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
import { CreatorDto } from 'src/creator/dto/creator.dto';
import { IsEmptyOrUrl } from 'src/decorators/IsEmptyOrUrl';
import { ComicStatsDto } from './comic-stats.dto';
import { WalletComicDto } from './wallet-comic.dto';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { getPublicUrl } from 'src/aws/s3client';
import { GenreDto } from 'src/genre/dto/genre.dto';
import { ComicStats } from '../types/comic-stats';
import { round } from 'lodash';
import {
  Comic,
  Genre,
  WalletComic,
  Creator,
  AudienceType,
} from '@prisma/client';

class PartialGenreDto extends PickType(GenreDto, [
  'name',
  'slug',
  'color',
  'icon',
]) {}
class PartialCreatorDto extends PickType(CreatorDto, [
  'name',
  'slug',
  'isVerified',
  'avatar',
]) {}

export class ComicDto {
  @IsString()
  name: string;

  @IsKebabCase()
  slug: string;

  @IsEnum(AudienceType)
  @ApiProperty({ enum: AudienceType, default: AudienceType.Everyone })
  audienceType: AudienceType;

  @IsBoolean()
  isDeleted: boolean;

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
  pfp: string;

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

  @IsOptional()
  @Type(() => ComicStatsDto)
  stats?: ComicStatsDto;

  @IsOptional()
  @Type(() => WalletComicDto)
  myStats?: WalletComicDto;

  @IsArray()
  @Type(() => PartialGenreDto)
  genres?: PartialGenreDto[];

  @Type(() => PartialCreatorDto)
  creator?: PartialCreatorDto;
}

type ComicInput = Comic & {
  genres?: Genre[];
  creator?: Creator;
  stats?: ComicStats;
  myStats?: WalletComic;
};

export function toComicDto(comic: ComicInput) {
  const plainComicDto: ComicDto = {
    name: comic.name,
    slug: comic.slug,
    audienceType: comic.audienceType,
    isCompleted: !!comic.completedAt,
    isDeleted: !!comic.deletedAt,
    isVerified: !!comic.verifiedAt,
    isPublished: !!comic.publishedAt,
    isPopular: !!comic.popularizedAt,
    cover: getPublicUrl(comic.cover),
    banner: getPublicUrl(comic.banner),
    pfp: getPublicUrl(comic.pfp),
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
    stats: comic?.stats
      ? {
          favouritesCount: comic.stats.favouritesCount,
          ratersCount: comic.stats.ratersCount,
          averageRating: round(comic.stats.averageRating),
          issuesCount: comic.stats.issuesCount,
          viewersCount: comic.stats.viewersCount,
        }
      : undefined,
    myStats: comic?.myStats
      ? {
          rating: comic.myStats.rating,
          isSubscribed: comic.myStats.isSubscribed,
          isFavourite: comic.myStats.isFavourite,
        }
      : undefined,
    // TODO: order genres by 'priority' and filter out the deleted genres
    genres: comic.genres?.map((genre) => {
      return {
        name: genre.name,
        slug: genre.slug,
        color: genre.color,
        icon: getPublicUrl(genre.icon),
      };
    }),
    creator: comic?.creator
      ? {
          name: comic.creator.name,
          slug: comic.creator.slug,
          isVerified: !!comic.creator.verifiedAt,
          avatar: getPublicUrl(comic.creator.avatar),
        }
      : undefined,
  };

  const comicDto = plainToInstance(ComicDto, plainComicDto);
  return comicDto;
}

export const toComicDtoArray = (comics: ComicInput[]) => {
  return comics.map(toComicDto);
};
