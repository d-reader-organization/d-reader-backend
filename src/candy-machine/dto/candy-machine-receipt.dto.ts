import { IsDateString, IsNumber, IsString, IsUrl } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { plainToInstance, Type } from 'class-transformer';
import { CandyMachineReceipt, Nft, Wallet } from '@prisma/client';
import { getReadUrl } from '../../aws/s3client';

class ReceiptNftDto {
  @IsSolanaAddress()
  address: string;

  @IsString()
  name: string;
}

export class BasicWalletDto {
  @IsSolanaAddress()
  address: string;

  @IsUrl()
  avatar: string;

  @IsString()
  name: string;
}

export class CandyMachineReceiptDto {
  @Type(() => ReceiptNftDto)
  nft: ReceiptNftDto;

  @Type(() => BasicWalletDto)
  buyer: BasicWalletDto;

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

export async function toCMReceiptDto(receipt: CandyMachineReceiptInput) {
  const plainReceiptDto: CandyMachineReceiptDto = {
    nft: {
      address: receipt.nft.address,
      name: receipt.nft.name,
    },
    buyer: {
      address: receipt.buyer.address,
      avatar: await getReadUrl(receipt.buyer.avatar),
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
  return Promise.all(receipts.map(toCMReceiptDto));
};
