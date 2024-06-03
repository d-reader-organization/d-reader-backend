import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { plainToInstance } from 'class-transformer';
import { Wallet } from '@prisma/client';
import { IsString } from 'class-validator';

export class WalletDto {
  @IsSolanaAddress()
  address: string;

  @IsString()
  label: string;
}

export function toWalletDto(wallet: Wallet) {
  const plainWalletDto: WalletDto = {
    address: wallet.address,
    label: wallet.label,
  };

  const walletDto = plainToInstance(WalletDto, plainWalletDto);
  return walletDto;
}

export const toWalletDtoArray = (wallets: Wallet[]) => {
  return wallets.map(toWalletDto);
};
