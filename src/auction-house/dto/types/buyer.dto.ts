import { User, Wallet } from '@prisma/client';
import { PublicKey } from '@solana/web3.js';
import { plainToInstance } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { getPublicUrl } from '../../../aws/s3client';
import { UserDto } from '../../../user/dto/user.dto';
import { getOwnerDomain } from '../../../utils/sns';
import { WalletDto } from '../../../wallet/dto/wallet.dto';

export class BuyerDto {
  id?: UserDto['id'];
  avatar?: UserDto['avatar'];
  name?: UserDto['name'];
  address: WalletDto['address'];

  @IsOptional()
  @IsString()
  sns?: string;
}

type Buyer = Wallet & { user?: User };

export async function toBuyerDto(buyer: Buyer) {
  const sns = await getOwnerDomain(new PublicKey(buyer.address));

  const plainBuyerDto: BuyerDto = {
    id: buyer.user?.id,
    avatar: getPublicUrl(buyer.user?.avatar),
    name: buyer.user?.name,
    address: buyer.address,
    sns,
  };

  const buyerDto = plainToInstance(BuyerDto, plainBuyerDto);
  return buyerDto;
}

export const toBuyerDtoArray = (buyers: Buyer[]) => {
  return buyers.map(toBuyerDto);
};
