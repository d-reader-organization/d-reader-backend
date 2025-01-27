import { IsArray, IsNumber } from 'class-validator';
import { WithGenres, WithTags, WithTraits } from './digital-asset.dto';
import { plainToInstance, Type } from 'class-transformer';
import { toTraitDtoArray, TraitDto } from './trait.dto';
import { ApiProperty } from '@nestjs/swagger';
import { DigitalAssetTagDto, toDigitalAssetTagDtoArray } from './tag.dto';
import { DigitalAssetGenreDto, toDigitalAssetGenreDtoArray } from './genre.dto';
import {
  DigitalAsset,
  PrintEdition,
  PrintEditionCollection,
} from '@prisma/client';
import { getPublicUrl } from 'src/aws/s3client';
import { divide } from 'lodash';
import {
  BaseDigitalAssetDto,
  DigitalAssetType,
} from './base-digital-asset.dto';

export class PrintEditionDto extends BaseDigitalAssetDto {
  @IsNumber()
  number: number;

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

export type WithPrintEditionCollection = {
  printEditionCollection: PrintEditionCollection;
};
type WithDigitalAsset = { digitalAsset: DigitalAsset };
export type WithPrintEditionDetails = PrintEdition & WithPrintEditionCollection;

export type PrintEditionInput = WithPrintEditionDetails &
  WithDigitalAsset &
  WithGenres &
  WithTraits &
  WithTags;
export function toPrintEditionDto(input: PrintEditionInput) {
  const { printEditionCollection, digitalAsset } = input;

  const plainPrintEditionDto: PrintEditionDto = {
    address: input.address,
    name: printEditionCollection.name,
    number: input.number,
    image: getPublicUrl(printEditionCollection.image),
    ownerAddress: digitalAsset.ownerAddress,
    royalties: divide(printEditionCollection.sellerFeeBasisPoints, 100),
    collectionAddress: input.collectionAddress,
    genres: toDigitalAssetGenreDtoArray(input.genres),
    tags: toDigitalAssetTagDtoArray(input.tags),
    traits: toTraitDtoArray(input.traits),
    type: DigitalAssetType.CollectibleComic,
  };

  const printEditionDto = plainToInstance(
    PrintEditionDto,
    plainPrintEditionDto,
  );
  return printEditionDto;
}

export const toPrintEditionDtoArray = (editions: PrintEditionInput[]) => {
  return editions.map(toPrintEditionDto);
};
