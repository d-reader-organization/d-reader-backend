import { IsBoolean, IsEnum, IsString, IsUrl } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { plainToInstance } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Wallet, Role } from '@prisma/client';
import { getCachedReadUrl } from '../../aws/s3client';

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

  @IsBoolean()
  hasBetaAccess: boolean;
}

export async function toWalletDto(wallet: Wallet) {
  const plainWalletDto: WalletDto = {
    address: wallet.address,
    name: wallet.name,
    avatar: await getCachedReadUrl(wallet.avatar),
    role: wallet.role,
    hasBetaAccess: !!wallet.referredAt,
  };

  const walletDto = plainToInstance(WalletDto, plainWalletDto);
  return walletDto;
}

export const toWalletDtoArray = (wallets: Wallet[]) => {
  return Promise.all(wallets.map(toWalletDto));
};
