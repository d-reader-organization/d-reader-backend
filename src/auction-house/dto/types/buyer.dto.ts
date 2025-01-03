import { User } from '@prisma/client';
import { PublicKey } from '@solana/web3.js';
import { plainToInstance } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { getPublicUrl } from '../../../aws/s3client';
import { UserDto } from '../../../user/dto/user.dto';
import { getOwnerDomain } from '../../../utils/sns';
import { WalletDto } from '../../../wallet/dto/wallet.dto';
import { ifDefined } from '../../../utils/lodash';

export class BuyerDto {
  id?: UserDto['id'];
  avatar?: UserDto['avatar'];
  username?: UserDto['username'];
  address: WalletDto['address'];
  displayName?: UserDto['displayName'];

  @IsOptional()
  @IsString()
  sns?: string;
}

type Buyer = { address: string } & { user?: User };

export async function toBuyerDto(buyer: Buyer) {
  const sns = await getOwnerDomain(new PublicKey(buyer.address));

  const plainBuyerDto: BuyerDto = {
    id: buyer.user?.id,
    avatar: ifDefined(buyer.user?.avatar, getPublicUrl),
    username: buyer.user?.username,
    displayName: buyer.user?.displayName,
    address: buyer.address,
    sns,
  };

  const buyerDto = plainToInstance(BuyerDto, plainBuyerDto);
  return buyerDto;
}

export const toBuyerDtoArray = (buyers: Buyer[]) => {
  return buyers.map(toBuyerDto);
};
