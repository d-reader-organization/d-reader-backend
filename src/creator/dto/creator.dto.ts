import { plainToInstance, Type } from 'class-transformer';
import {
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
import { Creator } from '@prisma/client';
import { getReadUrl } from 'src/aws/s3client';
import { IsOptionalUrl } from 'src/decorators/IsOptionalUrl';
import { WalletCreatorStats } from '../types/my-stats';
import { WalletCreatorStatsDto } from './wallet-creator.dto';

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

  @IsOptional()
  @Type(() => CreatorStatsDto)
  stats?: CreatorStatsDto;

  @IsOptional()
  @Type(() => WalletCreatorStatsDto)
  myStats?: WalletCreatorStatsDto;
}

type CreatorInput = Creator & {
  stats?: CreatorStats;
  myStats?: WalletCreatorStats;
};

export async function toCreatorDto(creator: CreatorInput) {
  const plainCreatorDto: CreatorDto = {
    id: creator.id,
    email: creator.email,
    name: creator.name,
    slug: creator.slug,
    isDeleted: !!creator.deletedAt,
    isVerified: !!creator.verifiedAt,
    avatar: await getReadUrl(creator.avatar),
    banner: await getReadUrl(creator.banner),
    logo: await getReadUrl(creator.logo),
    description: creator.description,
    flavorText: creator.flavorText,
    website: creator.website,
    stats: creator.stats,
    myStats: creator.myStats,
  };

  const creatorDto = plainToInstance(CreatorDto, plainCreatorDto);
  return creatorDto;
}

export const toCreatorDtoArray = (creators: CreatorInput[]) => {
  return Promise.all(creators.map(toCreatorDto));
};
