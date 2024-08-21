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
  MIN_CORE_MINT_PROTOCOL_FEE,
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
import { CoverFiles, ItemMetadata, RarityCoverFiles } from '../types/shared';
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
import { RoyaltyWalletDto } from 'src/comic-issue/dto/royalty-wallet.dto';

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
  candyMachineAddress: PublicKey,
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
  candyMachineAddress: PublicKey,
  comicIssue: ComicIssueCMInput,
  collectionNftAddress: PublicKey,
  comicName: string,
  royaltyWallets: RoyaltyWalletDto[],
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
  const itemMetadatas: ItemMetadata[] = [];

  for (const rarityShare of rarityShares) {
    const { rarity } = rarityShare;
    const itemMetadata = await uploadAllMetadata(
      metaplex,
      candyMachineAddress,
      comicIssue,
      comicName,
      royaltyWallets,
      rarityCoverFiles[rarity],
      darkblockId,
      RARITY_MAP[rarity],
    );
    itemMetadatas.push(...itemMetadata);
  }

  if (tokenStandard == TokenStandard.Legacy) {
    // initialize comic authority
    for await (const rarityShare of rarityShares) {
      const allData = itemMetadatas.filter(
        (item) => item.rarity === RARITY_MAP[rarityShare.rarity],
      );
      const comicStates: ComicStates = {
        unusedSigned: allData.find((data) => !data.isUsed && data.isSigned)
          .metadata.uri,
        unusedUnsigned: allData.find((data) => !data.isUsed && !data.isSigned)
          .metadata.uri,
        usedSigned: allData.find((data) => data.isUsed && data.isSigned)
          .metadata.uri,
        usedUnsigned: allData.find((data) => data.isUsed && !data.isSigned)
          .metadata.uri,
      };
      // TODO: Initialize authority in parallel
      await initializeAuthority(
        metaplex,
        candyMachineAddress,
        collectionNftAddress,
        RARITY_MAP[rarityShare.rarity],
        comicStates,
      );
    }
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

export async function insertItems(
  metaplex: Metaplex,
  candyMachine: CandyMachine<DefaultCandyGuardSettings>,
  comicIssue: ComicIssueCMInput,
  collectionNftAddress: PublicKey,
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
        { commitment: 'confirmed', skipPreflight: true },
      );
    });
  }
  return itemMetadatas;
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
