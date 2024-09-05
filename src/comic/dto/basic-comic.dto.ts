import { plainToInstance } from 'class-transformer';
import { IsBoolean, IsEnum, IsString, IsUrl } from 'class-validator';
import { IsKebabCase } from '../../decorators/IsKebabCase';
import { IsEmptyOrUrl } from '../../decorators/IsEmptyOrUrl';
import { ApiProperty } from '@nestjs/swagger';
import { getPublicUrl } from '../../aws/s3client';
import { Comic, AudienceType } from '@prisma/client';

export class BasicComicDto {
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

export function toBasicComicDto(comic: Comic) {
  const plainComicDto: BasicComicDto = {
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

  const comicDto = plainToInstance(BasicComicDto, plainComicDto);
  return comicDto;
}

export const toBasicComicDtoArray = (comics: Comic[]) => {
  return comics.map(toBasicComicDto);
};
