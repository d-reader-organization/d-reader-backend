import { IsDateString, IsNumber, IsString } from 'class-validator';
import { plainToInstance, Type } from 'class-transformer';
import {
  CandyMachineReceipt,
  DigitalAsset,
  User,
  Wallet,
} from '@prisma/client';
import { BuyerDto, toBuyerDto } from '../../auction-house/dto/types/buyer.dto';
import { AssetDto } from '../../digital-asset/dto/digital-asset.dto';
import { PickType } from '@nestjs/swagger';

export class PartialAssetDto extends PickType(AssetDto, ['address', 'name']) {}

export class CandyMachineReceiptDto {
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
  asset: DigitalAsset;
  buyer: Wallet & { user: User };
};

export async function toCMReceiptDto(receipt: CandyMachineReceiptInput) {
  const plainReceiptDto: CandyMachineReceiptDto = {
    nft: {
      address: receipt.asset.address,
      name: receipt.asset.name,
    },
    asset: {
      address: receipt.asset.address,
      name: receipt.asset.name,
    },
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
