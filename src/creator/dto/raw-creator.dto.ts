import { plainToInstance, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { Creator } from '@prisma/client';
import { getPublicUrl } from 'src/aws/s3client';
import { IsOptionalUrl } from 'src/decorators/IsOptionalUrl';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';
import { IsOptionalString } from 'src/decorators/IsOptionalString';
import { PartialGenreDto } from 'src/genre/dto/partial-genre.dto';

export class RawCreatorDto {
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

  @IsDateString()
  verifiedAt: string;

  @IsOptional()
  @IsDateString()
  emailVerifiedAt?: string;

  @IsUrl()
  avatar: string;

  @IsUrl()
  banner: string;

  @IsUrl()
  logo: string;

  @IsString()
  @MaxLength(512)
  description: string;

  @IsString()
  @MaxLength(128)
  flavorText: string;

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
  lynkfire: string;

  @IsArray()
  @Type(() => PartialGenreDto)
  genres?: PartialGenreDto[];
}

export function toRawCreatorDto(creator: Creator) {
  const plainRawCreatorDto: RawCreatorDto = {
    id: creator.id,
    email: creator.email,
    name: creator.name,
    slug: creator.slug,
    verifiedAt: creator.verifiedAt?.toISOString(),
    emailVerifiedAt: creator.emailVerifiedAt?.toISOString(),
    avatar: getPublicUrl(creator.avatar),
    banner: getPublicUrl(creator.banner),
    logo: getPublicUrl(creator.logo),
    description: creator.description,
    flavorText: creator.flavorText,
    tippingAddress: creator.tippingAddress,
    website: creator.website,
    twitter: creator.twitterHandle,
    instagram: creator.instagram,
    lynkfire: creator.lynkfire,
  };

  const creatorDto = plainToInstance(RawCreatorDto, plainRawCreatorDto);
  return creatorDto;
}

export const toRawCreatorDtoArray = (creators: Creator[]) => {
  return creators.map(toRawCreatorDto);
};
