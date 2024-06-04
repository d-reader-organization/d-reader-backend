import {
  dateTime,
  some,
  lamports,
  publicKey,
  Umi,
  PublicKey as UmiPublicKey,
  chunk,
} from '@metaplex-foundation/umi';
import {
  GuardGroupArgs,
  DefaultGuardSetArgs,
  getMerkleRoot,
  ThirdPartySigner,
} from '@metaplex-foundation/mpl-core-candy-machine';
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
import { TokenStandard } from '@prisma/client';
import { getThirdPartySigner } from './metaplex';
import { getTransactionWithPriorityFee } from './das';
import { constructInsertItemsTransaction } from '../candy-machine/instructions/insert-items';
import { decodeUmiTransaction } from './transactions';

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
    const thirdPartySigner = getThirdPartySigner();
    const thirdPartySignerGuard: ThirdPartySigner = {
      signerKey: publicKey(thirdPartySigner),
    };

    groups.push({
      label: PUBLIC_GROUP_LABEL,
      guards: {
        startDate: startDate ? some({ date: dateTime(startDate) }) : undefined,
        endDate: endDate ? some({ date: dateTime(endDate) }) : undefined,
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
        thirdPartySigner: some(thirdPartySignerGuard),
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
  const { items, itemMetadatas } = await uploadItemMetadata(
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
  const transactions: string[] = [];
  for (const itemsChunk of itemChunks) {
    console.info(`Inserting items ${index}-${index + itemsChunk.length} `);

    const defaultComputeBudget = 800_000;
    const transaction = await getTransactionWithPriorityFee(
      constructInsertItemsTransaction,
      defaultComputeBudget,
      umi,
      candyMachinePubkey,
      index,
      itemsChunk,
    );
    index += itemsChunk.length;

    transactions.push(transaction);
  }

  const rateLimit = pRateLimit(rateLimitQuota);
  for (const addConfigLinesTransaction of transactions) {
    const deserializedTransaction = decodeUmiTransaction(
      addConfigLinesTransaction,
      'base64',
    );
    rateLimit(() => {
      return umi.rpc.sendTransaction(deserializedTransaction, {
        skipPreflight: true,
        commitment: 'confirmed',
      });
    });
  }
  return itemMetadatas;
}
