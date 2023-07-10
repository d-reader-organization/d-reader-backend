import { IsDateString, IsNumber, IsString } from 'class-validator';
import { plainToInstance, Type } from 'class-transformer';
import { CandyMachineReceipt, Nft, Wallet } from '@prisma/client';
import { getPublicUrl } from '../../aws/s3client';
import { WalletDto } from '../../wallet/dto/wallet.dto';
import { PickType } from '@nestjs/swagger';
import { NftDto } from '../../nft/dto/nft.dto';

export class PartialWalletDto extends PickType(WalletDto, [
  'address',
  'avatar',
  'name',
]) {}

export class PartialNftDto extends PickType(NftDto, ['address', 'name']) {}

export class CandyMachineReceiptDto {
  @Type(() => PartialNftDto)
  nft: PartialNftDto;

  @Type(() => PartialWalletDto)
  buyer: PartialWalletDto;

  @IsString()
  candyMachineAddress: string;

  @IsNumber()
  price: number;

  @IsDateString()
  timestamp: string;
}

export type CandyMachineReceiptInput = CandyMachineReceipt & {
  nft: Nft;
  buyer: Wallet;
};

export function toCMReceiptDto(receipt: CandyMachineReceiptInput) {
  const plainReceiptDto: CandyMachineReceiptDto = {
    nft: {
      address: receipt.nft.address,
      name: receipt.nft.name,
    },
    buyer: {
      address: receipt.buyer.address,
      avatar: getPublicUrl(receipt.buyer.avatar),
      name: receipt.buyer.name,
    },
    candyMachineAddress: receipt.candyMachineAddress,
    price: receipt.price,
    timestamp: receipt.timestamp.toISOString(),
  };

  const receiptDto = plainToInstance(CandyMachineReceiptDto, plainReceiptDto);
  return receiptDto;
}

export const toCMReceiptDtoArray = (receipts: CandyMachineReceiptInput[]) => {
  return receipts.map(toCMReceiptDto);
};
