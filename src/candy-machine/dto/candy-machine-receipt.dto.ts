import { IsDateString, IsNumber, IsString } from 'class-validator';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';
import { plainToInstance } from 'class-transformer';
import { CandyMachineReceipt } from '@prisma/client';

export class CandyMachineReceiptDto {
  @IsSolanaAddress()
  nftAddress: string;

  @IsSolanaAddress()
  candyMachineAddress: string;

  @IsSolanaAddress()
  buyer: string;

  @IsNumber()
  price: number;

  @IsDateString()
  timestamp: string;

  @IsString()
  description: string;
}

export async function toCMReceiptDto(receipt: CandyMachineReceipt) {
  const plainReceiptDto: CandyMachineReceiptDto = {
    nftAddress: receipt.nftAddress,
    candyMachineAddress: receipt.candyMachineAddress,
    buyer: receipt.buyer,
    price: receipt.price,
    timestamp: receipt.timestamp.toISOString(),
    description: receipt.description,
  };

  const receiptDto = plainToInstance(CandyMachineReceiptDto, plainReceiptDto);
  return receiptDto;
}

export const toCMReceiptDtoArray = (receipts: CandyMachineReceipt[]) => {
  return Promise.all(receipts.map(toCMReceiptDto));
};
