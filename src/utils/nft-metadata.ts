import { JsonMetadata } from '@metaplex-foundation/js';
import { RARITY_TRAIT, SIGNED_TRAIT, USED_TRAIT } from '../constants';
import { BadRequestException } from '@nestjs/common';
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

export const findRarityTrait = (jsonMetadata: JsonMetadata) =>
  findTrait(jsonMetadata, RARITY_TRAIT).value;

export const fetchOffChainMetadata = async (uri: string) => {
  return (await axios.get<JsonMetadata>(uri)).data;
};

export function generateComicAttributes(): [boolean, boolean][] {
  const combinations: [boolean, boolean][] = [];

  for (const i of [false, true]) {
    for (const j of [false, true]) {
      combinations.push([i, j]);
    }
  }

  return combinations;
}

export function generatePropertyName(
  isUsed: boolean,
  isSigned: boolean,
): string {
  return (isUsed ? 'used' : 'unused') + (isSigned ? 'Signed' : 'Unsigned');
}
