import {
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
  ThirdPartySigner,
  SolPayment,
  TokenPayment,
} from '@metaplex-foundation/mpl-core-candy-machine';
import {
  AUTHORITY_GROUP_LABEL,
  FUNDS_DESTINATION_ADDRESS,
  MIN_CORE_MINT_PROTOCOL_FEE,
  MIN_MINT_PROTOCOL_FEE,
  rateLimitQuota,
  SOL_ADDRESS,
} from '../constants';
import { MetaplexFile } from '@metaplex-foundation/js';
import { ComicIssueCMInput } from 'src/comic-issue/dto/types';
import { RarityCoverFiles } from 'src/types/shared';
import { pRateLimit } from 'p-ratelimit';
import { TokenStandard } from '@prisma/client';
import { getIrysUri, getThirdPartySigner } from './metaplex';
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
import { AddCandyMachineCouponParamsWithLabels } from 'src/candy-machine/dto/types';
import { findAssociatedTokenPda } from '@metaplex-foundation/mpl-toolbox';
import { DigitalAssetJsonMetadata } from 'src/digital-asset/dto/types';

export type JsonMetadataCreators = JsonMetadata['properties']['creators'];

export function generatePropertyName(
  isUsed: boolean,
  isSigned: boolean,
): string {
  return (isUsed ? 'used' : 'unused') + (isSigned ? 'Signed' : 'Unsigned');
}

export async function uploadMetadata(
  umi: Umi,
  comicIssue: ComicIssueCMInput,
  comicName: string,
  royaltyWallets: RoyaltyWalletDto[],
  imageFile: MetaplexFile,
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

  const [image] = await umi.uploader.upload([imageFile]);

  const jsonMetadata: DigitalAssetJsonMetadata = {
    name: comicIssue.title,
    symbol: D_PUBLISHER_SYMBOL,
    description: comicIssue.description,
    seller_fee_basis_points: comicIssue.sellerFeeBasisPoints,
    image: getIrysUri(image),
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
      files: darkblockId ? [{ type: 'Darkblock', uri: darkblockId }] : [],
    },
    collection: {
      name: comicIssue.title,
      family: comicName,
    },
  };

  return await umi.uploader.uploadJson(jsonMetadata);
}

export async function uploadAllMetadata(
  umi: Umi,
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

      const uri = await uploadMetadata(
        umi,
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
        uri: getIrysUri(uri),
        isUsed,
        isSigned,
        rarity,
      });
    }),
  );

  return itemMetadata;
}

export async function uploadItemMetadata(
  umi: Umi,
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
      umi,
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
        uri: data.uri,
        name: `${onChainName} #${nameIndex}`,
      };
    });

    items.push(...itemsInserted);
    index++;
  }
  return { items, itemMetadatas };
}

export function toUmiGroups(
  umi: Umi,
  coupons: AddCandyMachineCouponParamsWithLabels[],
): GuardGroupArgs<DefaultGuardSetArgs>[] {
  const thirdPartySigner = getThirdPartySigner();
  const thirdPartySignerGuard: ThirdPartySigner = {
    signerKey: publicKey(thirdPartySigner),
  };

  const groups: GuardGroupArgs<DefaultGuardSetArgs>[] = [
    {
      label: AUTHORITY_GROUP_LABEL,
      guards: {
        // allowList: {
        //   merkleRoot: getMerkleRoot([umi.identity.publicKey.toString()]),
        // },
        thirdPartySigner: some(thirdPartySignerGuard),
        solPayment: {
          lamports: lamports(0),
          destination: publicKey(FUNDS_DESTINATION_ADDRESS),
        },
      },
    },
  ];

  coupons.forEach((coupon) => {
    const { currencySettings, supply } = coupon;
    currencySettings.forEach((setting) => {
      let paymentGuardName: string;

      let paymentGuard: TokenPayment | SolPayment;
      const { splTokenAddress, mintPrice } = setting;
      const isSolPayment = splTokenAddress === SOL_ADDRESS;

      if (isSolPayment) {
        paymentGuardName = 'solPayment';
        paymentGuard = {
          lamports: lamports(mintPrice),
          destination: publicKey(FUNDS_DESTINATION_ADDRESS),
        };
      } else {
        paymentGuardName = 'tokenPayment';
        paymentGuard = {
          amount: BigInt(mintPrice),
          destinationAta: findAssociatedTokenPda(umi, {
            mint: publicKey(splTokenAddress),
            owner: publicKey(FUNDS_DESTINATION_ADDRESS),
          })[0],
          mint: publicKey(splTokenAddress),
        };
      }

      groups.push({
        label: setting.label,
        guards: {
          // startDate: startsAt ? some({ date: dateTime(startsAt) }) : undefined,
          // endDate: expiresAt ? some({ date: dateTime(expiresAt) }) : undefined,
          [paymentGuardName]: some(paymentGuard),
          // Currently using centralized mint limit
          // mintLimit: numberOfRedemptions
          //   ? {
          //       id: index,
          //       limit: numberOfRedemptions,
          //     }
          //   : undefined,
          redeemedAmount: some({ maximum: supply }),
          thirdPartySigner: some(thirdPartySignerGuard),
        },
      });
    });
  });

  return groups;
}

export async function insertCoreItems(
  umi: Umi,
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
    umi,
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

export function calculateMissingToken(
  missingFunds: number,
  decimals: number,
): number {
  return parseFloat((missingFunds / Math.pow(10, decimals)).toFixed(3));
}

export function validateBalanceForMint(
  mintPrice: number,
  solBalance: number,
  tokenBalance: number,
  tokenSymbol: string,
  tokenDecimals: number,
  numberOfItems: number,
  tokenStandard?: TokenStandard,
): void {
  // MIN_MINT_PROTOCOL_FEE is the approx amount necessary to mint a single asset with price 0

  const protocolFee =
    tokenStandard === TokenStandard.Core
      ? MIN_CORE_MINT_PROTOCOL_FEE
      : MIN_MINT_PROTOCOL_FEE;

  const totalMintPrice = numberOfItems * mintPrice;
  const totalProtocolFeeRequired = numberOfItems * protocolFee;

  const isSolPayment = tokenBalance == 0;

  const missingSolFunds = isSolPayment
    ? totalMintPrice + totalProtocolFeeRequired - solBalance
    : totalProtocolFeeRequired - solBalance;

  if (
    (!isSolPayment || !totalMintPrice) &&
    solBalance < totalProtocolFeeRequired
  ) {
    throw new BadRequestException(
      `You need ~${calculateMissingSOL(
        missingSolFunds,
      )} more SOL in your wallet to pay for protocol fees`,
    );
  }

  if (isSolPayment && solBalance < totalMintPrice + totalProtocolFeeRequired) {
    throw new BadRequestException(
      `You need ~${calculateMissingSOL(
        missingSolFunds,
      )} more SOL in your wallet to pay for protocol fees`,
    );
  } else if (!isSolPayment) {
    const missingTokenFunds = totalMintPrice - tokenBalance;

    if (tokenBalance < totalMintPrice) {
      throw new BadRequestException(
        `You need ~${calculateMissingToken(
          missingTokenFunds,
          tokenDecimals,
        )} more ${tokenSymbol} in your wallet to pay for purchase`,
      );
    }
  }
}
