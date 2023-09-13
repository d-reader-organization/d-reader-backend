import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';
import { plainToInstance, Type } from 'class-transformer';
import { CandyMachineReceipt, Nft, User, Wallet } from '@prisma/client';
import { getPublicUrl } from '../../aws/s3client';
import { PickType } from '@nestjs/swagger';
import { NftDto } from '../../nft/dto/nft.dto';
import { UserDto } from '../../user/dto/user.dto';
import { WalletDto } from '../../wallet/dto/wallet.dto';
import { getOwnerDomain } from '../../utils/sns';
import { PublicKey } from '@solana/web3.js';

export class BuyerDto {
  id?: UserDto['id'];
  avatar?: UserDto['avatar'];
  name?: UserDto['name'];
  address: WalletDto['address'];
  @IsOptional()
  @IsString()
  sns?: string;
}

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
  const sns = await getOwnerDomain(new PublicKey(receipt.buyer.address));
  const plainReceiptDto: CandyMachineReceiptDto = {
    nft: {
      address: receipt.nft.address,
      name: receipt.nft.name,
    },
    buyer: {
      id: receipt.buyer.user?.id,
      avatar: getPublicUrl(receipt.buyer.user?.avatar),
      name: receipt.buyer.user?.name,
      address: receipt.buyer.address,
      sns,
    },
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
