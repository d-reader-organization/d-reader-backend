import { IsArray } from 'class-validator';
import { WithGenres, WithTags, WithTraits } from './digital-asset.dto';
import { plainToInstance, Type } from 'class-transformer';
import { toTraitDtoArray, TraitDto } from './trait.dto';
import { ApiProperty } from '@nestjs/swagger';
import { DigitalAssetTagDto, toDigitalAssetTagDtoArray } from './tag.dto';
import { DigitalAssetGenreDto, toDigitalAssetGenreDtoArray } from './genre.dto';
import { DigitalAsset, OneOfOne } from '@prisma/client';
import { getPublicUrl } from 'src/aws/s3client';
import { divide } from 'lodash';
import {
  BaseDigitalAssetDto,
  DigitalAssetType,
} from './base-digital-asset.dto';

export class OneOfOneDto extends BaseDigitalAssetDto {
  @IsArray()
  @Type(() => TraitDto)
  @ApiProperty({ type: [TraitDto] })
  traits: TraitDto[];

  @IsArray()
  @Type(() => DigitalAssetTagDto)
  @ApiProperty({ type: [DigitalAssetTagDto] })
  tags: DigitalAssetTagDto[];

  @IsArray()
  @Type(() => DigitalAssetGenreDto)
  @ApiProperty({ type: [DigitalAssetGenreDto] })
  genres: DigitalAssetGenreDto[];
}

type WithDigitalAsset = { digitalAsset: DigitalAsset };
export type OneOfOneInput = OneOfOne &
  WithDigitalAsset &
  WithGenres &
  WithTraits &
  WithTags;
export function toOneOfOneDto(input: OneOfOneInput) {
  const { digitalAsset } = input;

  const plainOneOfOneDto: OneOfOneDto = {
    address: input.address,
    name: input.name,
    image: getPublicUrl(input.image),
    ownerAddress: digitalAsset.ownerAddress,
    royalties: divide(input.sellerFeeBasisPoints, 100),
    collectionAddress: input.collectionAddress,
    genres: toDigitalAssetGenreDtoArray(input.genres),
    tags: toDigitalAssetTagDtoArray(input.tags),
    traits: toTraitDtoArray(input.traits),
    type: DigitalAssetType.OneOfOne,
  };

  const oneOfOneDto = plainToInstance(OneOfOneDto, plainOneOfOneDto);
  return oneOfOneDto;
}

export const toOneOfOneDtoArray = (oneOfOnes: OneOfOneInput[]) => {
  return oneOfOnes.map(toOneOfOneDto);
};
