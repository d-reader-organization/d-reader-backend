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
import { DISPLAY_NAME_MAX_SIZE } from 'src/constants';

export class RawCreatorDto {
  @IsPositive()
  id: number;

  @IsNotEmpty()
  @MaxLength(54)
  handle: string;

  @IsNotEmpty()
  @MaxLength(DISPLAY_NAME_MAX_SIZE)
  displayName: string;

  @IsDateString()
  verifiedAt: string;

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

  @IsArray()
  @Type(() => PartialGenreDto)
  genres?: PartialGenreDto[];
}

export function toRawCreatorDto(creator: CreatorChannel) {
  const plainRawCreatorDto: RawCreatorDto = {
    id: creator.id,
    handle: creator.handle,
    displayName: creator.displayName,
    verifiedAt: creator.verifiedAt?.toISOString(),
    avatar: getPublicUrl(creator.avatar),
    banner: getPublicUrl(creator.banner),
    description: creator.description,
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
