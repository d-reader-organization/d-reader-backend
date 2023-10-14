import {
  JsonMetadata,
  Metaplex,
  MetaplexFile,
  PublicKey,
} from '@metaplex-foundation/js';
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
import { BadRequestException } from '@nestjs/common';
import { initializeAuthority } from '../candy-machine/instructions';
import { CoverFiles, ItemMedata, RarityCoverFiles } from '../types/shared';
import { ComicStates, ComicRarity } from 'dreader-comic-verse';
import { ComicIssueCMInput } from '../comic-issue/dto/types';
import { ComicRarity as PrismaComicRarity } from '@prisma/client';
import { writeFiles } from './metaplex';
import { isNil } from 'lodash';
import axios from 'axios';

const findTrait = (jsonMetadata: JsonMetadata, traitType: string) => {
  const trait = jsonMetadata.attributes.find((a) => a.trait_type === traitType);

  if (isNil(trait)) {
    throw new BadRequestException(
      `Unsupported NFT type, no ${traitType} trait specified`,
    );
  }

  return trait;
};

export const findUsedTrait = (jsonMetadata: JsonMetadata) =>
  findTrait(jsonMetadata, USED_TRAIT).value === 'true';

export const findSignedTrait = (jsonMetadata: JsonMetadata) =>
  findTrait(jsonMetadata, SIGNED_TRAIT).value === 'true';

export const findRarityTrait = (
  jsonMetadata: JsonMetadata,
): PrismaComicRarity =>
  PrismaComicRarity[findTrait(jsonMetadata, RARITY_TRAIT).value];

export const fetchOffChainMetadata = async (uri: string) => {
  return (await axios.get<JsonMetadata>(uri)).data;
};

export function generatePropertyName(
  isUsed: boolean,
  isSigned: boolean,
): string {
  return (isUsed ? 'used' : 'unused') + (isSigned ? 'Signed' : 'Unsigned');
}

type JsonMetadataCreators = JsonMetadata['properties']['creators'];

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

  await initializeAuthority(
    metaplex,
    candyMachineAddress,
    collectionNftAddress,
    rarity,
    comicStates,
  );

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
  rarityCoverFiles?: RarityCoverFiles,
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
    );
    const { unusedUnsigned } = itemMetadata;
    itemMetadatas.push({
      uri: unusedUnsigned.uri,
      name: unusedUnsigned.metadata.name,
    });
  }

  let index = 0;
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
    const itemsInserted = await Promise.all(
      indexArray.map((i) => ({
        uri: metadata.uri,
        name: `${metadata.name} #${i + 1}`,
      })),
    );

    items.push(...itemsInserted);
    index++;
  }
  return items;
}
