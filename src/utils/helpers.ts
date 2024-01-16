import {
  Metadata,
  Metaplex,
  Nft,
  PublicKey,
  isNft,
  sol,
} from '@metaplex-foundation/js';
import {
  Connection,
  LAMPORTS_PER_SOL,
  ParsedAccountData,
  TransactionInstruction,
} from '@solana/web3.js';
import { HIGH_VALUE, LOW_VALUE } from '../constants';
import { fetchOffChainMetadata, findRarityTrait } from './nft-metadata';
import { AUTH_TAG, pda } from '../candy-machine/instructions/pda';
import { PROGRAM_ID as COMIC_VERSE_ID } from 'dreader-comic-verse';

export const currencyFormat = Object.freeze(
  new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
);

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function chance(chanceForTrue: number) {
  return getRandomInt(0, 10) > chanceForTrue / 10;
}

export function maybeDateNow(chanceForTrue: number) {
  return chance(chanceForTrue) ? new Date() : undefined;
}

export function getRandomFloatOrInt(min: number, max: number) {
  const randomFloat = Math.floor(Math.random() * (max - min + 1) + min);
  return parseFloat(currencyFormat.format(randomFloat));
}

export function solFromLamports(lamports: number) {
  return sol(parseFloat((lamports / LAMPORTS_PER_SOL).toFixed(9)));
}

export function mockPromise<T>(value: T) {
  return new Promise<T>((resolve) =>
    setTimeout(() => {
      resolve(value);
    }, 50),
  );
}

export const formatCurrency = (value?: number, currency = '') => {
  const suffix = currency ? ` ${currency}` : '';
  if (!value) return '-.--' + suffix;
  return currencyFormat.format(value) + suffix;
};

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
const compactHeader = (n: number) =>
  n <= LOW_VALUE ? 1 : n <= HIGH_VALUE ? 2 : 3;
const compactArraySize = (n: number, size: number) =>
  compactHeader(n) + n * size;

// need more research for better calculation of computeUnits
export function getComputeUnits(instructions: TransactionInstruction[]) {
  const signers = new Set<string>();
  const accounts = new Set<string>();

  const size = instructions.reduce((acc, ix) => {
    ix.keys.forEach(({ pubkey, isSigner }) => {
      const pk = pubkey.toBase58();
      if (isSigner) signers.add(pk);
      accounts.add(pk);
    });
    accounts.add(ix.programId.toBase58());
    const nIndexes = ix.keys.length;
    const opaqueData = ix.data.length;

    return (
      1 + acc + compactArraySize(nIndexes, 1) + compactArraySize(opaqueData, 1)
    );
  }, 0);

  return 200000 + 100000 * instructions.length + 100 * size;
}

export const shortenString = (string: string, chars = 3): string => {
  if (string.length < chars * 2 + 3) return string;
  return `${string.slice(0, chars)}..${string.slice(-chars)}`;
};

/** returns the string with a Date.now() as suffixs for uniqueness
 * @example 'avatar-1688122756821' */
export const appendTimestamp = (string: string) => string + '-' + Date.now();
export const importDynamic = new Function(
  'modulePath',
  'return import(modulePath)',
);

export function findOurCandyMachine(
  metaplex: Metaplex,
  candyMachines: { address: string }[],
  metadata: Metadata | Nft,
) {
  const candyMachine = candyMachines.find(
    (cm) =>
      metadata?.creators?.length > 0 &&
      metaplex
        .candyMachines()
        .pdas()
        .authority({ candyMachine: new PublicKey(cm.address) })
        .equals(metadata.creators[0].address),
  );
  return candyMachine?.address;
}

export async function doesWalletIndexCorrectly(
  metadataOrNft: Metadata | Nft,
  nfts: string[],
  candyMachineAddress: string,
) {
  const mintAddress = isNft(metadataOrNft)
    ? metadataOrNft.address
    : metadataOrNft.mintAddress;
  for (const nft of nfts) {
    const doesNftExists = nft === mintAddress.toString();
    if (doesNftExists) {
      const updateAuthority = metadataOrNft.updateAuthorityAddress;
      const offChainMetadata = await fetchOffChainMetadata(metadataOrNft.uri);
      const rarity = findRarityTrait(offChainMetadata);
      const authority = pda(
        [
          Buffer.from(AUTH_TAG + rarity.toLowerCase()),
          new PublicKey(candyMachineAddress).toBuffer(),
          metadataOrNft.collection.address.toBuffer(),
        ],
        COMIC_VERSE_ID,
      );

      if (
        updateAuthority.equals(authority) &&
        metadataOrNft.creators[1].verified
      ) {
        return true;
      }
    }
  }
  return false;
}

export async function findOwnerByMint(
  connection: Connection,
  mintAddress: PublicKey,
): Promise<string> {
  const largestAccounts = await connection.getTokenLargestAccounts(mintAddress);
  const largestAccountInfo = await connection.getParsedAccountInfo(
    largestAccounts.value[0].address,
  );
  const data = largestAccountInfo.value.data as ParsedAccountData;
  return data.parsed.info.owner;
}
