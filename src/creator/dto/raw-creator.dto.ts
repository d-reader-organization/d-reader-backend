import { plainToInstance, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { CreatorChannel } from '@prisma/client';
import { getPublicUrl } from 'src/aws/s3client';
import { IsOptionalUrl } from 'src/decorators/IsOptionalUrl';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';
import { IsOptionalString } from 'src/decorators/IsOptionalString';
import { PartialGenreDto } from 'src/genre/dto/partial-genre.dto';

export class RawCreatorDto {
  @IsPositive()
  id: number;

  @IsNotEmpty()
  @MaxLength(54)
  handle: string;

  @IsDateString()
  verifiedAt: string;

  @IsUrl()
  avatar: string;

  @IsUrl()
  banner: string;

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
  linktree: string;

  @IsArray()
  @Type(() => PartialGenreDto)
  genres?: PartialGenreDto[];
}

export function toRawCreatorDto(creator: CreatorChannel) {
  const plainRawCreatorDto: RawCreatorDto = {
    id: creator.id,
    handle: creator.handle,
    verifiedAt: creator.verifiedAt?.toISOString(),
    avatar: getPublicUrl(creator.avatar),
    banner: getPublicUrl(creator.banner),
    description: creator.description,
    flavorText: creator.flavorText,
    tippingAddress: creator.tippingAddress,
    website: creator.website,
    twitter: creator.twitter,
    instagram: creator.instagram,
    linktree: creator.linktree,
  };

  const creatorDto = plainToInstance(RawCreatorDto, plainRawCreatorDto);
  return creatorDto;
}

export const toRawCreatorDtoArray = (creators: CreatorChannel[]) => {
  return creators.map(toRawCreatorDto);
};
