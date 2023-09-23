import { IsDateString, IsNumber, IsString } from 'class-validator';
import { plainToInstance, Type } from 'class-transformer';
import { CandyMachineReceipt, Nft, User, Wallet } from '@prisma/client';
import { BuyerDto, toBuyerDto } from '../../auction-house/dto/types/buyer.dto';
import { NftDto } from '../../nft/dto/nft.dto';
import { PickType } from '@nestjs/swagger';

export class PartialNftDto extends PickType(NftDto, ['address', 'name']) {}

export class CandyMachineReceiptDto {
  @Type(() => PartialNftDto)
  nft: PartialNftDto;

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
  nft: Nft;
  buyer: Wallet & { user: User };
};

export async function toCMReceiptDto(receipt: CandyMachineReceiptInput) {
  const plainReceiptDto: CandyMachineReceiptDto = {
    nft: {
      address: receipt.nft.address,
      name: receipt.nft.name,
    },
    buyer: await toBuyerDto(receipt.buyer),
    candyMachineAddress: receipt.candyMachineAddress,
    price: receipt.price,
    timestamp: receipt.timestamp.toISOString(),
    splTokenAddress: receipt.splTokenAddress,
  };

  const receiptDto = plainToInstance(CandyMachineReceiptDto, plainReceiptDto);
  return receiptDto;
}

export const toCMReceiptDtoArray = (receipts: CandyMachineReceiptInput[]) => {
  return Promise.all(receipts.map(toCMReceiptDto));
};
