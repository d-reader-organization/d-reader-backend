import { RoyaltyWallet } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';

export class RoyaltyWalletDto {
  @IsSolanaAddress()
  address: string;

  @Min(0)
  @Max(100)
  @IsInt()
  share: number;
}

export function toRoyaltyWalletDto(royaltyWallet: RoyaltyWallet) {
  const plainRoyaltyWalletDto: RoyaltyWalletDto = {
    address: royaltyWallet.address,
    share: royaltyWallet.share,
  };

  const royaltyWalletDto = plainToInstance(
    RoyaltyWalletDto,
    plainRoyaltyWalletDto,
  );
  return royaltyWalletDto;
}

export const toRoyaltyWalletDtoArray = (royaltyWallets: RoyaltyWallet[]) => {
  return royaltyWallets.map(toRoyaltyWalletDto);
};
