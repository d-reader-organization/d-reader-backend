import { WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import { Prisma } from '@prisma/client';
import { USDC_ADDRESS } from '../src/constants';

export const splTokensToSeed: Prisma.SplTokenCreateManyArgs['data'] = [
  {
    name: 'Wrapped Sol',
    address: WRAPPED_SOL_MINT.toBase58(),
    priority: 1,
    symbol: '$SOL',
    decimals: 9,
    icon: 'spl-tokens/wrapped-sol.svg',
  },
  {
    name: 'USD Coin',
    address: USDC_ADDRESS,
    priority: 2,
    symbol: '$USDC',
    decimals: 6,
    icon: 'spl-tokens/usd-coin.png',
  },
];
