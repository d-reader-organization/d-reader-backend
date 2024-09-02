import { JsonMetadata } from '@metaplex-foundation/js';
import { RARITY_TRAIT, SIGNED_TRAIT, USED_TRAIT } from '../constants';
import { BadRequestException } from '@nestjs/common';
import { ComicRarity as PrismaComicRarity } from '@prisma/client';
import { isNil } from 'lodash';
import axios from 'axios';
import { DigitalAssetJsonMetadata } from 'src/digital-asset/dto/types';

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

export const fetchDigitalAssetOffChainMetadata = async (uri: string) => {
  return (await axios.get<DigitalAssetJsonMetadata>(uri)).data;
};
