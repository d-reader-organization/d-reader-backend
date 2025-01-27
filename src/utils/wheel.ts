import { Umi, publicKey } from '@metaplex-foundation/umi';
import { BadRequestException } from '@nestjs/common';
import { SOL_ADDRESS } from 'src/constants';
import {
  findAssociatedTokenPda,
  getTokenAccountDataSerializer,
} from '@metaplex-foundation/mpl-toolbox';
import { WheelRewardType } from '@prisma/client';

export function validateWheelDate(startsAt: Date, expiresAt?: Date) {
  if (!expiresAt) return;
  if (startsAt >= expiresAt) {
    throw new BadRequestException(
      'expiry date cannot be earlier than start date',
    );
  }
}

export async function validateWalletBalance(
  umi: Umi,
  walletAddress: string,
  targetBalance: number,
  splTokenAddress = SOL_ADDRESS,
) {
  const wallet = publicKey(walletAddress);
  const isSol = splTokenAddress == SOL_ADDRESS;

  if (!isSol) {
    const solBalance = await umi.rpc.getBalance(wallet);

    return Number(solBalance.basisPoints) >= targetBalance;
  } else {
    const splToken = publicKey(splTokenAddress);

    const tokenPda = findAssociatedTokenPda(umi, {
      mint: splToken,
      owner: wallet,
    });
    const account = await umi.rpc.getAccount(tokenPda[0]);

    if (account.exists) {
      const data = account.data;
      const tokenAccount = getTokenAccountDataSerializer().deserialize(data);

      return Number(tokenAccount[0].amount) >= targetBalance;
    }
  }
}

export const getWheelAdminS3Folder = (
  rewardType: WheelRewardType,
  field: 'image' | 'icon',
) => `admin/wheel/${rewardType}/${field}`;
