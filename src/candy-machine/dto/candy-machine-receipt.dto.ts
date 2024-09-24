import { IsArray, IsDateString, IsNumber, IsString } from 'class-validator';
import { plainToInstance, Type } from 'class-transformer';
import {
  CandyMachineReceipt,
  CollectibleComic,
  User,
  Wallet,
} from '@prisma/client';
import { BuyerDto, toBuyerDto } from '../../auction-house/dto/types/buyer.dto';
import { AssetDto } from '../../digital-asset/dto/digital-asset.dto';
import { PickType } from '@nestjs/swagger';

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

  @Type(() => BuyerDto)
  buyer: BuyerDto;

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
  buyer: Wallet & { user: User };
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
    buyer: await toBuyerDto(receipt.buyer),
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
