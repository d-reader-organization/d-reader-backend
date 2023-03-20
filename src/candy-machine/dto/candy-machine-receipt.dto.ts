import { IsDateString, IsNumber, IsString, IsUrl } from 'class-validator';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';
import { plainToInstance, Type } from 'class-transformer';
import { CandyMachineReceipt, Nft, Wallet } from '@prisma/client';
import { getReadUrl } from 'src/aws/s3client';

class ReceiptNftDto {
  @IsSolanaAddress()
  address: string;

  @IsString()
  name: string;
}

class ReceiptBuyerDto {
  @IsSolanaAddress()
  address: string;

  @IsUrl()
  avatar: string;

  @IsString()
  label: string;
}

export class CandyMachineReceiptDto {
  @Type(() => ReceiptNftDto)
  nft: ReceiptNftDto;

  @Type(() => ReceiptBuyerDto)
  buyer: ReceiptBuyerDto;

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
      label: receipt.buyer.label,
    },
    price: receipt.price,
    timestamp: receipt.timestamp.toISOString(),
  };

  const receiptDto = plainToInstance(CandyMachineReceiptDto, plainReceiptDto);
  return receiptDto;
}

export const toCMReceiptDtoArray = (receipts: CandyMachineReceiptInput[]) => {
  return Promise.all(receipts.map(toCMReceiptDto));
};
