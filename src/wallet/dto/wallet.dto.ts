import { IsEnum, IsString, IsUrl } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { plainToInstance } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Wallet, Role } from '@prisma/client';
import { getReadUrl } from '../../aws/s3client';

export class WalletDto {
  @IsSolanaAddress()
  address: string;

  @IsString()
  name: string;

  @IsUrl()
  avatar: string;

  @IsEnum(Role)
  @ApiProperty({ enum: Role })
  role: Role;
}

export async function toWalletDto(wallet: Wallet) {
  const plainWalletDto: WalletDto = {
    address: wallet.address,
    name: wallet.name,
    avatar: await getReadUrl(wallet.avatar),
    role: wallet.role,
  };

  const walletDto = plainToInstance(WalletDto, plainWalletDto);
  return walletDto;
}

export const toWalletDtoArray = (wallets: Wallet[]) => {
  return Promise.all(wallets.map(toWalletDto));
};
