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
import {
  AUTHORITY_GROUP_LABEL,
  FUNDS_DESTINATION_ADDRESS,
  MIN_CORE_MINT_PROTOCOL_FEE,
  MIN_MINT_PROTOCOL_FEE,
  PUBLIC_GROUP_LABEL,
  PUBLIC_GROUP_MINT_LIMIT_ID,
  rateLimitQuota,
} from '../constants';
import { Metaplex, MetaplexFile } from '@metaplex-foundation/js';
import { ComicIssueCMInput } from 'src/comic-issue/dto/types';
import { RarityCoverFiles } from 'src/types/shared';
import { pRateLimit } from 'p-ratelimit';
import { TokenStandard } from '@prisma/client';
import { getThirdPartySigner } from './metaplex';
import { getTransactionWithPriorityFee } from './das';
import { constructInsertItemsTransaction } from '../candy-machine/instructions/insert-items';
import { decodeUmiTransaction } from './transactions';
import { RoyaltyWalletDto } from 'src/comic-issue/dto/royalty-wallet.dto';
import { BadRequestException } from '@nestjs/common';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { JsonMetadata } from '@metaplex-foundation/js';
import {
  ATTRIBUTE_COMBINATIONS,
  D_PUBLISHER_SYMBOL,
  D_READER_FRONTEND_URL,
  RARITY_MAP,
  RARITY_TRAIT,
  SIGNED_TRAIT,
  USED_TRAIT,
  getRarityShareTable,
} from '../constants';
import { CoverFiles, ItemMetadata } from '../types/shared';
import { ComicRarity } from 'dreader-comic-verse';
import { writeFiles } from './metaplex';
import { shuffle } from 'lodash';
import { CreateCandyMachineParams } from 'src/candy-machine/dto/types';

export type JsonMetadataCreators = JsonMetadata['properties']['creators'];

export function generatePropertyName(
  isUsed: boolean,
  isSigned: boolean,
): string {
  return (isUsed ? 'used' : 'unused') + (isSigned ? 'Signed' : 'Unsigned');
}

export async function uploadMetadata(
  metaplex: Metaplex,
  comicIssue: ComicIssueCMInput,
  comicName: string,
  royaltyWallets: RoyaltyWalletDto[],
  image: MetaplexFile,
  isUsed: string,
  isSigned: string,
  rarity: ComicRarity,
  darkblockId?: string,
) {
  const creators: JsonMetadataCreators = royaltyWallets.map((item) => {
    return {
      address: item.address,
      percentage: item.share,
    };
  });

  return await metaplex.nfts().uploadMetadata({
    name: comicIssue.title,
    symbol: D_PUBLISHER_SYMBOL,
    description: comicIssue.description,
    seller_fee_basis_points: comicIssue.sellerFeeBasisPoints,
    image,
    external_url: D_READER_FRONTEND_URL,
    attributes: [
      {
        trait_type: RARITY_TRAIT,
        value: ComicRarity[rarity].toString(),
      },
      {
        trait_type: USED_TRAIT,
        value: isUsed,
      },
      {
        trait_type: SIGNED_TRAIT,
        value: isSigned,
      },
    ],
    properties: {
      creators,
      files: [
        ...writeFiles(image),
        darkblockId ? { type: 'Darkblock', uri: darkblockId } : undefined,
      ],
    },
    collection: {
      name: comicIssue.title,
      family: comicName,
    },
  });
}

export async function uploadAllMetadata(
  metaplex: Metaplex,
  comicIssue: ComicIssueCMInput,
  comicName: string,
  royaltyWallets: RoyaltyWalletDto[],
  rarityCoverFiles: CoverFiles,
  darkblockId: string,
  rarity: ComicRarity,
) {
  const itemMetadata: ItemMetadata[] = [];
  await Promise.all(
    ATTRIBUTE_COMBINATIONS.map(async ([isUsed, isSigned]) => {
      const property = generatePropertyName(isUsed, isSigned);
      const darkblock = isUsed ? darkblockId : undefined;
      const metadata = await uploadMetadata(
        metaplex,
        comicIssue,
        comicName,
        royaltyWallets,
        rarityCoverFiles[property],
        isUsed.toString(),
        isSigned.toString(),
        rarity,
        darkblock,
      );

      itemMetadata.push({
        metadata,
        isUsed,
        isSigned,
        rarity,
      });
    }),
  );

  return itemMetadata;
}

export async function uploadItemMetadata(
  metaplex: Metaplex,
  comicIssue: ComicIssueCMInput,
  comicName: string,
  royaltyWallets: RoyaltyWalletDto[],
  numberOfRarities: number,
  darkblockId: string,
  comicIssueSupply: number,
  onChainName: string,
  rarityCoverFiles?: RarityCoverFiles,
) {
  const items: { uri: string; name: string }[] = [];
  // TODO: rarityShares is not reliable, we should pull this info from the database
  const rarityShares = getRarityShareTable(numberOfRarities);
  const itemMetadatas: ItemMetadata[] = [];

  for (const rarityShare of rarityShares) {
    const { rarity } = rarityShare;
    const itemMetadata = await uploadAllMetadata(
      metaplex,
      comicIssue,
      comicName,
      royaltyWallets,
      rarityCoverFiles[rarity],
      darkblockId,
      RARITY_MAP[rarity],
    );
    itemMetadatas.push(...itemMetadata);
  }

  const unusedUnsignedMetadatas = itemMetadatas.filter(
    (item) => !item.isUsed && !item.isSigned,
  );

  let supplyLeft = comicIssueSupply;
  let index = 0,
    nameIndex = 0;

  for (const data of unusedUnsignedMetadatas) {
    let supply: number;
    const { value } = rarityShares[index];
    if (index == rarityShares.length - 1) {
      supply = supplyLeft;
    } else {
      supply = Math.floor((comicIssueSupply * value) / 100);
      supplyLeft -= supply;
    }
    const indexArray = Array.from(Array(supply).keys());
    const itemsInserted = indexArray.map(() => {
      nameIndex++;
      return {
        uri: data.metadata.uri,
        name: `${onChainName} #${nameIndex}`,
      };
    });

    items.push(...itemsInserted);
    index++;
  }
  return { items: shuffle(items), itemMetadatas };
}

export function toUmiGroups(
  umi: Umi,
  createCandyMachineParams: CreateCandyMachineParams,
  isPublic: boolean,
): GuardGroupArgs<DefaultGuardSetArgs>[] {
  const { startsAt, expiresAt, mintPrice, numberOfRedemptions, supply } =
    createCandyMachineParams;
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
        startDate: startsAt ? some({ date: dateTime(startsAt) }) : undefined,
        endDate: expiresAt ? some({ date: dateTime(expiresAt) }) : undefined,
        solPayment: some({
          lamports: lamports(mintPrice),
          destination: publicKey(FUNDS_DESTINATION_ADDRESS),
        }),
        mintLimit: numberOfRedemptions
          ? {
              id: PUBLIC_GROUP_MINT_LIMIT_ID,
              limit: numberOfRedemptions,
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
  comicName: string,
  royaltyWallets: RoyaltyWalletDto[],
  statelessCovers: MetaplexFile[],
  darkblockId: string,
  supply: number,
  onChainName: string,
  rarityCoverFiles?: RarityCoverFiles,
) {
  const { items, itemMetadatas } = await uploadItemMetadata(
    metaplex,
    comicIssue,
    comicName,
    royaltyWallets,
    statelessCovers.length,
    darkblockId,
    supply,
    onChainName,
    rarityCoverFiles,
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

export function calculateMissingSOL(missingFunds: number): number {
  return parseFloat((missingFunds / LAMPORTS_PER_SOL).toFixed(3)) + 0.001;
}

export function validateBalanceForMint(
  mintPrice: number,
  balance: number,
  tokenStandard?: TokenStandard,
): void {
  // MIN_MINT_PROTOCOL_FEE is the approx amount necessary to mint an NFT with price 0
  const protocolFee =
    tokenStandard === TokenStandard.Core
      ? MIN_CORE_MINT_PROTOCOL_FEE
      : MIN_MINT_PROTOCOL_FEE;

  const missingFunds = mintPrice
    ? mintPrice + protocolFee - balance
    : protocolFee - balance;

  if (!mintPrice && balance < protocolFee) {
    throw new BadRequestException(
      `You need ~${calculateMissingSOL(
        missingFunds,
      )} more SOL in your wallet to pay for protocol fees`,
    );
  } else if (mintPrice && balance < mintPrice) {
    throw new BadRequestException(
      `You need ~${calculateMissingSOL(
        missingFunds,
      )} more SOL in your wallet to pay for purchase`,
    );
  } else if (mintPrice && balance < mintPrice + protocolFee) {
    throw new BadRequestException(
      `You need ~${calculateMissingSOL(
        missingFunds,
      )} more SOL in your wallet to pay for protocol fees`,
    );
  }
}
