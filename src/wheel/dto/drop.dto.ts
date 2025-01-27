import { IsBoolean, IsNumber, IsString, IsUrl } from 'class-validator';
import {
  CollectibleComicDto,
  CollectibleComicInput,
  toCollectibleComicDto,
} from 'src/digital-asset/dto/collectible-comic.dto';
import {
  OneOfOneDto,
  OneOfOneInput,
  toOneOfOneDto,
} from 'src/digital-asset/dto/one-of-one.dto';
import {
  PrintEditionDto,
  PrintEditionInput,
  toPrintEditionDto,
} from 'src/digital-asset/dto/print-edition.dto';
import { PhysicalItem, RewardDrop, SplToken } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { getPublicUrl } from 'src/aws/s3client';

export class BaseDropDto {
  @IsNumber()
  id: number;

  @IsBoolean()
  isActive: boolean;
}

export class CollectibleComicDropDto extends BaseDropDto {
  asset: CollectibleComicDto;
}

export class PrintEditionDropDto extends BaseDropDto {
  asset: PrintEditionDto;
}

export class OneOfOneDropDto extends BaseDropDto {
  asset: OneOfOneDto;
}

export class FungibleDropDto extends BaseDropDto {
  @IsString()
  name: string;

  @IsString()
  address: string;

  @IsNumber()
  decimals: number;

  @IsString()
  symbol: string;

  @IsUrl()
  image: string;

  @IsString()
  amount: number;
}

export class PhysicalDropDto extends BaseDropDto {
  @IsString()
  name: string;

  @IsString()
  itemId: string;

  @IsUrl()
  image: string;
}

export type CollectibleComicDropInput = RewardDrop & {
  collectibleComic: CollectibleComicInput;
};
export function toCollectibleComicDropDto(input: CollectibleComicDropInput) {
  const plainCollectibleComicDropDto: CollectibleComicDropDto = {
    id: input.id,
    isActive: input.isActive,
    asset: toCollectibleComicDto(input.collectibleComic),
  };

  const collectibleComicDropDto = plainToInstance(
    CollectibleComicDropDto,
    plainCollectibleComicDropDto,
  );
  return collectibleComicDropDto;
}

export type PrintEditionDropInput = RewardDrop & {
  printEdition: PrintEditionInput;
};
export function toPrintEditionDropDto(input: PrintEditionDropInput) {
  const plainPrintEditionDropDto: PrintEditionDropDto = {
    id: input.id,
    isActive: input.isActive,
    asset: toPrintEditionDto(input.printEdition),
  };

  const printEditionDropDto = plainToInstance(
    PrintEditionDropDto,
    plainPrintEditionDropDto,
  );
  return printEditionDropDto;
}

export type OneOfOneDropInput = RewardDrop & { oneOfOne: OneOfOneInput };
export function toOneOfOneDropDto(input: OneOfOneDropInput) {
  const plainOneOfOneDropDto: OneOfOneDropDto = {
    id: input.id,
    isActive: input.isActive,
    asset: toOneOfOneDto(input.oneOfOne),
  };

  const oneOfOneDropDto = plainToInstance(
    OneOfOneDropDto,
    plainOneOfOneDropDto,
  );
  return oneOfOneDropDto;
}

export type PhysicalDropInput = RewardDrop & { physical: PhysicalItem };
export function toPhysicalDropDto(input: PhysicalDropInput) {
  const physical = input.physical;

  const plainPhysicalDropDto: PhysicalDropDto = {
    id: input.id,
    isActive: input.isActive,
    name: physical.name,
    itemId: physical.id,
    image: getPublicUrl(physical.image),
  };

  const physicalDropDto = plainToInstance(
    PhysicalDropDto,
    plainPhysicalDropDto,
  );
  return physicalDropDto;
}

export type FungibleDropInput = RewardDrop & { fungible: SplToken };
export function toFungibleDropDto(input: FungibleDropInput) {
  const fungible = input.fungible;

  const plainFungibleDropDto: FungibleDropDto = {
    id: input.id,
    isActive: input.isActive,
    name: fungible.name,
    address: fungible.address,
    decimals: fungible.decimals,
    symbol: fungible.symbol,
    image: getPublicUrl(fungible.icon),
    amount: input.amount,
  };

  const fungibleDropDto = plainToInstance(
    FungibleDropDto,
    plainFungibleDropDto,
  );
  return fungibleDropDto;
}
