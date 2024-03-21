import {
  dateTime,
  some,
  lamports,
  publicKey,
  Umi,
  PublicKey as UmiPublicKey,
  chunk,
  TransactionBuilder,
} from '@metaplex-foundation/umi';
import {
  GuardGroupArgs,
  DefaultGuardSetArgs,
  getMerkleRoot,
  addConfigLines,
} from 'cma-preview';
import { GuardParams } from '../candy-machine/dto/types';
import {
  AUTHORITY_GROUP_LABEL,
  FUNDS_DESTINATION_ADDRESS,
  PUBLIC_GROUP_LABEL,
  PUBLIC_GROUP_MINT_LIMIT_ID,
  rateLimitQuota,
} from '../constants';
import { Metaplex, MetaplexFile, PublicKey } from '@metaplex-foundation/js';
import { ComicIssueCMInput } from 'src/comic-issue/dto/types';
import { JsonMetadataCreators, uploadItemMetadata } from './candy-machine';
import { RarityCoverFiles } from 'src/types/shared';
import { pRateLimit } from 'p-ratelimit';
import { setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox';
import { TokenStandard } from '@prisma/client';

export function toUmiGroups(
  umi: Umi,
  guardParams: GuardParams,
  isPublic: boolean,
): GuardGroupArgs<DefaultGuardSetArgs>[] {
  const { startDate, endDate, mintPrice, mintLimit, supply, frozen } =
    guardParams;
  const paymentGuard = frozen ? 'freezeSolPayment' : 'solPayment';
  const groups: GuardGroupArgs<DefaultGuardSetArgs>[] = [
    {
      label: AUTHORITY_GROUP_LABEL,
      guards: {
        allowList: {
          merkleRoot: getMerkleRoot([umi.identity.publicKey.toString()]),
        },
        solPayment: {
          lamports: lamports(0),
          destination: publicKey(FUNDS_DESTINATION_ADDRESS),
        },
      },
    },
  ];

  if (isPublic) {
    groups.push({
      label: PUBLIC_GROUP_LABEL,
      guards: {
        startDate: some({ date: dateTime(startDate) }),
        endDate: some({ date: dateTime(endDate) }),
        [paymentGuard]: some({
          lamports: lamports(mintPrice),
          destination: publicKey(FUNDS_DESTINATION_ADDRESS),
        }),
        mintLimit: mintLimit
          ? {
              id: PUBLIC_GROUP_MINT_LIMIT_ID,
              limit: mintLimit,
            }
          : undefined,
        redeemedAmount: some({ maximum: supply }),
      },
    });
  }
  return groups;
}

export async function insertCoreItems(
  umi: Umi,
  metaplex: Metaplex,
  candyMachinePubkey: UmiPublicKey,
  comicIssue: ComicIssueCMInput,
  collectionNftAddress: UmiPublicKey,
  comicName: string,
  royaltyWallets: JsonMetadataCreators,
  statelessCovers: MetaplexFile[],
  darkblockId: string,
  supply: number,
  onChainName: string,
  rarityCoverFiles?: RarityCoverFiles,
) {
  const items = await uploadItemMetadata(
    metaplex,
    new PublicKey(candyMachinePubkey),
    comicIssue,
    new PublicKey(collectionNftAddress),
    comicName,
    royaltyWallets,
    statelessCovers.length,
    darkblockId,
    supply,
    onChainName,
    rarityCoverFiles,
    TokenStandard.Core,
  );

  const INSERT_CHUNK_SIZE = 8;
  const itemChunks = chunk(items, INSERT_CHUNK_SIZE);

  let index = 0;
  const transactionBuilders: TransactionBuilder[] = [];
  for (const itemsChunk of itemChunks) {
    console.info(`Inserting items ${index}-${index + itemsChunk.length} `);
    const transactionBuilder = addConfigLines(umi, {
      index,
      configLines: itemsChunk,
      candyMachine: candyMachinePubkey,
    });

    index += itemsChunk.length;
    transactionBuilders.push(transactionBuilder);
  }

  const rateLimit = pRateLimit(rateLimitQuota);
  for (const addConfigLineBuilder of transactionBuilders) {
    const builder = setComputeUnitPrice(umi, { microLamports: 600_000 }).add(
      addConfigLineBuilder,
    );
    rateLimit(() => {
      return builder.sendAndConfirm(umi, { send: { commitment: 'confirmed' } });
    });
  }
}
