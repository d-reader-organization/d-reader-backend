import {
  CandyMachine,
  DefaultCandyGuardSettings,
  JsonMetadata,
  Metaplex,
  MetaplexFile,
  PublicKey,
  TransactionBuilder,
  getMerkleRoot,
  toBigNumber,
  toDateTime,
} from '@metaplex-foundation/js';
import {
  ATTRIBUTE_COMBINATIONS,
  AUTHORITY_GROUP_LABEL,
  D_PUBLISHER_SYMBOL,
  D_READER_FRONTEND_URL,
  FUNDS_DESTINATION_ADDRESS,
  MIN_COMPUTE_PRICE_IX,
  MIN_MINT_PROTOCOL_FEE,
  PUBLIC_GROUP_LABEL,
  PUBLIC_GROUP_MINT_LIMIT_ID,
  RARITY_MAP,
  RARITY_TRAIT,
  SIGNED_TRAIT,
  USED_TRAIT,
  getRarityShareTable,
  rateLimitQuota,
} from '../constants';
import { initializeAuthority } from '../candy-machine/instructions';
import { CoverFiles, ItemMedata, RarityCoverFiles } from '../types/shared';
import { ComicStates, ComicRarity } from 'dreader-comic-verse';
import { ComicIssueCMInput } from '../comic-issue/dto/types';
import { writeFiles } from './metaplex';
import { chunk, shuffle } from 'lodash';
import { pRateLimit } from 'p-ratelimit';
import {
  LAMPORTS_PER_SOL,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { BadRequestException } from '@nestjs/common';
import { GuardParams } from 'src/candy-machine/dto/types';
import { solFromLamports } from './helpers';
import { TokenStandard } from '@prisma/client';

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
  creators: JsonMetadataCreators,
  image: MetaplexFile,
  isUsed: string,
  isSigned: string,
  rarity: ComicRarity,
  darkblockId?: string,
) {
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
  candyMachineAddress: PublicKey,
  comicIssue: ComicIssueCMInput,
  comicName: string,
  royaltyWallets: JsonMetadataCreators,
  rarityCoverFiles: CoverFiles,
  darkblockId: string,
  rarity: ComicRarity,
  collectionNftAddress: PublicKey,
  tokenStandard?: TokenStandard,
) {
  const itemMetadata: ItemMedata = {} as ItemMedata;
  await Promise.all(
    ATTRIBUTE_COMBINATIONS.map(async ([isUsed, isSigned]) => {
      const property = generatePropertyName(isUsed, isSigned);
      const darkblock = isUsed ? darkblockId : undefined;
      itemMetadata[property] = await uploadMetadata(
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
    }),
  );

  const comicStates: ComicStates = {
    unusedSigned: itemMetadata.unusedSigned.uri,
    unusedUnsigned: itemMetadata.unusedUnsigned.uri,
    usedSigned: itemMetadata.usedSigned.uri,
    usedUnsigned: itemMetadata.usedUnsigned.uri,
  };

  if (!tokenStandard || tokenStandard == TokenStandard.Legacy) {
    await initializeAuthority(
      metaplex,
      candyMachineAddress,
      collectionNftAddress,
      rarity,
      comicStates,
    );
  }

  return itemMetadata;
}

export async function uploadItemMetadata(
  metaplex: Metaplex,
  candMachineAddress: PublicKey,
  comicIssue: ComicIssueCMInput,
  collectionNftAddress: PublicKey,
  comicName: string,
  royaltyWallets: JsonMetadataCreators,
  numberOfRarities: number,
  darkblockId: string,
  comicIssueSupply: number,
  onChainName: string,
  rarityCoverFiles?: RarityCoverFiles,
  tokenStandard?: TokenStandard,
) {
  const items: { uri: string; name: string }[] = [];

  // TODO v2: rarityShares is not reliable, we should pull this info from the database
  const rarityShares = getRarityShareTable(numberOfRarities);
  const itemMetadatas: { uri: string; name: string }[] = [];
  let supplyLeft = comicIssueSupply;
  for (const rarityShare of rarityShares) {
    const { rarity } = rarityShare;
    const itemMetadata = await uploadAllMetadata(
      metaplex,
      candMachineAddress,
      comicIssue,
      comicName,
      royaltyWallets,
      rarityCoverFiles[rarity],
      darkblockId,
      RARITY_MAP[rarity],
      collectionNftAddress,
      tokenStandard,
    );
    const { unusedUnsigned } = itemMetadata;
    itemMetadatas.push({
      uri: unusedUnsigned.uri,
      name: onChainName,
    });
  }

  let index = 0,
    nameIndex = 0;
  for (const metadata of itemMetadatas) {
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
        uri: metadata.uri,
        name: `${metadata.name} #${nameIndex}`,
      };
    });

    items.push(...itemsInserted);
    index++;
  }
  return shuffle(items);
}

export async function insertItems(
  metaplex: Metaplex,
  candyMachine: CandyMachine<DefaultCandyGuardSettings>,
  comicIssue: ComicIssueCMInput,
  collectionNftAddress: PublicKey,
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
    candyMachine.address,
    comicIssue,
    collectionNftAddress,
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
  const transactionBuilders: TransactionBuilder[] = [];
  for (const itemsChunk of itemChunks) {
    console.info(`Inserting items ${index}-${index + itemsChunk.length} `);
    const transactionBuilder = metaplex.candyMachines().builders().insertItems({
      candyMachine,
      index,
      items: itemsChunk,
    });
    index += itemsChunk.length;
    transactionBuilders.push(transactionBuilder);
  }
  const rateLimit = pRateLimit(rateLimitQuota);
  for (const transactionBuilder of transactionBuilders) {
    const latestBlockhash = await metaplex.connection.getLatestBlockhash();
    const insertItemTransaction =
      transactionBuilder.toTransaction(latestBlockhash);

    const transaction = new Transaction({
      feePayer: metaplex.identity().publicKey,
      ...latestBlockhash,
    }).add(MIN_COMPUTE_PRICE_IX, insertItemTransaction);

    rateLimit(() => {
      return sendAndConfirmTransaction(
        metaplex.connection,
        transaction,
        [metaplex.identity()],
        { commitment: 'confirmed' },
      );
    });
  }
}

export function toLegacyGroups(
  metaplex: Metaplex,
  guardParams: GuardParams,
  isPublic: boolean,
) {
  const { startDate, endDate, mintLimit, freezePeriod, mintPrice, supply } =
    guardParams;

  const groups: {
    label: string;
    guards: Partial<DefaultCandyGuardSettings>;
  }[] = [
    {
      label: AUTHORITY_GROUP_LABEL,
      guards: {
        allowList: {
          merkleRoot: getMerkleRoot([metaplex.identity().publicKey.toString()]),
        },
        solPayment: {
          amount: solFromLamports(0),
          destination: FUNDS_DESTINATION_ADDRESS,
        },
      },
    },
  ];

  if (isPublic) {
    const paymentGuard = freezePeriod ? 'freezeSolPayment' : 'solPayment';
    groups.push({
      label: PUBLIC_GROUP_LABEL,
      guards: {
        startDate: { date: toDateTime(startDate) },
        endDate: { date: toDateTime(endDate) },
        [paymentGuard]: {
          amount: solFromLamports(mintPrice),
          destination: FUNDS_DESTINATION_ADDRESS,
        },
        mintLimit: mintLimit
          ? {
              id: PUBLIC_GROUP_MINT_LIMIT_ID,
              limit: mintLimit,
            }
          : undefined,
        redeemedAmount: { maximum: toBigNumber(supply) },
      },
    });
  }

  return groups;
}

export function calculateMissingSOL(missingFunds: number): number {
  return parseFloat((missingFunds / LAMPORTS_PER_SOL).toFixed(3)) + 0.001;
}

export function validateBalanceForMint(
  mintPrice: number,
  balance: number,
): void {
  // MIN_MINT_PROTOCOL_FEE is the approx amount necessary to mint an NFT with price 0
  const protocolFee = MIN_MINT_PROTOCOL_FEE;
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
