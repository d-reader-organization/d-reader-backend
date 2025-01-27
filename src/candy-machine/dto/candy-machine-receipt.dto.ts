import { IsArray, IsDateString, IsNumber, IsString } from 'class-validator';
import { plainToInstance, Type } from 'class-transformer';
import { CandyMachineReceipt, CollectibleComic, User } from '@prisma/client';
import { AssetDto } from '../../digital-asset/dto/deprecated-digital-asset.dto';
import { PickType } from '@nestjs/swagger';
import { BasicUserDto, toBasicUserDto } from '../../user/dto/basic-user-dto';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { ifDefined } from 'src/utils/lodash';

export class PartialAssetDto extends PickType(AssetDto, ['address', 'name']) {}

export class CandyMachineReceiptDto {
  @IsArray()
  @Type(() => PartialAssetDto)
  assets: PartialAssetDto[];

  /* @deprecated */
  @Type(() => PartialAssetDto)
  asset: PartialAssetDto;

  /* @deprecated */
  @Type(() => PartialAssetDto)
  nft: PartialAssetDto;

  @Type(() => BasicUserDto)
  buyer?: BasicUserDto;

  @IsSolanaAddress()
  buyerAddress: string;

  @IsString()
  candyMachineAddress: string;

  @IsNumber()
  price: number;

  @IsDateString()
  timestamp: string;

  @IsString()
  splTokenAddress: string;
}

export type CandyMachineReceiptInput = CandyMachineReceipt & {
  collectibleComics: CollectibleComic[];
  user: User;
};

export async function toCMReceiptDto(receipt: CandyMachineReceiptInput) {
  const assets = receipt.collectibleComics.map((collectibleComic) => ({
    address: collectibleComic.address,
    name: collectibleComic.name,
  }));

  const plainReceiptDto: CandyMachineReceiptDto = {
    nft: {
      address: receipt.collectibleComics[0].address,
      name: receipt.collectibleComics[0].name,
    },
    asset: {
      address: receipt.collectibleComics[0].address,
      name: receipt.collectibleComics[0].name,
    },
    assets,
    buyer: ifDefined(receipt.user, toBasicUserDto),
    buyerAddress: receipt.buyerAddress,
    candyMachineAddress: receipt.candyMachineAddress,
    price: Number(receipt.price),
    timestamp: receipt.timestamp.toISOString(),
    splTokenAddress: receipt.splTokenAddress,
  };

  const receiptDto = plainToInstance(CandyMachineReceiptDto, plainReceiptDto);
  return receiptDto;
}

export const toCMReceiptDtoArray = (receipts: CandyMachineReceiptInput[]) => {
  return Promise.all(receipts.map(toCMReceiptDto));
};
