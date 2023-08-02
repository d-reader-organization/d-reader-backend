import { IsDateString, IsNumber, IsString } from 'class-validator';
import { plainToInstance, Type } from 'class-transformer';
import { CandyMachineReceipt, Nft, User, Wallet } from '@prisma/client';
import { getPublicUrl } from '../../aws/s3client';
import { PickType } from '@nestjs/swagger';
import { NftDto } from '../../nft/dto/nft.dto';
import { UserDto } from '../../user/dto/user.dto';
import { WalletDto } from '../../wallet/dto/wallet.dto';

export class BuyerDto {
  id?: UserDto['id'];
  avatar?: UserDto['avatar'];
  name?: UserDto['name'];
  address: WalletDto['address'];
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
}

export type CandyMachineReceiptInput = CandyMachineReceipt & {
  nft: Nft;
  buyer: Wallet & { user: User };
};

export function toCMReceiptDto(receipt: CandyMachineReceiptInput) {
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
