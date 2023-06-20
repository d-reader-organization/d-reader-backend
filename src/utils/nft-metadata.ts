import { JsonMetadata } from '@metaplex-foundation/js';
import { SIGNED_TRAIT, USED_TRAIT } from '../constants';
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

export const fetchOffChainMetadata = async (uri: string) => {
  return (await axios.get<JsonMetadata>(uri)).data;
};
