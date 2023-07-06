import { ComicRarity } from 'dreader-comic-verse';
import { RarityShare } from './comic-issue/dto/types';

export const MAX_NAME_LENGTH = 32;
export const MAX_URI_LENGTH = 200;
export const MAX_SYMBOL_LENGTH = 10;
export const MAX_CREATOR_LEN = 32 + 1 + 1;
export const MAX_CREATOR_LIMIT = 5;
export const MAX_DATA_SIZE =
  4 +
  MAX_NAME_LENGTH +
  4 +
  MAX_SYMBOL_LENGTH +
  4 +
  MAX_URI_LENGTH +
  2 +
  1 +
  4 +
  MAX_CREATOR_LIMIT * MAX_CREATOR_LEN;
export const MAX_METADATA_LEN = 1 + 32 + 32 + MAX_DATA_SIZE + 1 + 1 + 9 + 172;
export const CREATOR_ARRAY_START =
  1 +
  32 +
  32 +
  4 +
  MAX_NAME_LENGTH +
  4 +
  MAX_URI_LENGTH +
  4 +
  MAX_SYMBOL_LENGTH +
  2 +
  1 +
  4;

export const D_READER_SYMBOL = 'dReader';
export const D_PUBLISHER_SYMBOL = 'dPublisher';

export const D_READER_FRONTEND_URL = 'https://dreader.app';

export const HUNDRED = 100;
export const HUNDRED_PERCENT_TAX = 10000;

// export const GLOBAL_BOT_TAX = 0.01;

export const USED_TRAIT = 'used';
export const SIGNED_TRAIT = 'signed';
export const DEFAULT_COMIC_ISSUE_USED = 'false';
export const DEFAULT_COMIC_ISSUE_IS_SIGNED = 'false';
export const RARITY_TRAIT = 'rarity';

export const LOW_VALUE = 127;
export const HIGH_VALUE = 16383;

export const BUNDLR_ADDRESS =
  process.env.SOLANA_CLUSTER === 'devnet'
    ? 'https://devnet.bundlr.network'
    : 'https://node1.bundlr.network';

export const WALLET_NAME_SIZE = 32;
export const SAGA_COLLECTION_ADDRESS =
  '46pcSL5gmjBrPqGKFaLbbCmR6iVuLJbnQy13hAe7s6CC';
export const USERNAME_VALIDATOR_REGEX = new RegExp(/^[\w-]+$/);

export const THREE_RARITIES_SHARE: RarityShare[] = [
  {
    rarity: ComicRarity.Common,
    value: 70,
  },
  {
    rarity: ComicRarity.Rare,
    value: 25,
  },
  {
    rarity: ComicRarity.Legendary,
    value: 5,
  },
];

export const FIVE_RARITIES_SHARE: RarityShare[] = [
  {
    rarity: ComicRarity.Common,
    value: 60,
  },
  {
    rarity: ComicRarity.Uncommon,
    value: 25,
  },
  {
    rarity: ComicRarity.Rare,
    value: 10,
  },
  {
    rarity: ComicRarity.Epic,
    value: 3,
  },
  {
    rarity: ComicRarity.Legendary,
    value: 2,
  },
];

export const ONE_RARITY_SHARE: RarityShare[] = [
  {
    rarity: ComicRarity.None,
    value: 100,
  },
];

export const MAX_SIGNATURES_PERCENT = 10;
export const MIN_SIGNATURES = 10;

export const getRarityShareTable = (numberOfCovers: number) => {
  switch (numberOfCovers) {
    case 3:
      return THREE_RARITIES_SHARE;
    case 5:
      return FIVE_RARITIES_SHARE;
    case 1:
      return ONE_RARITY_SHARE;
    default:
      throw new Error('Unsupported number of rarities');
  }
};

export const BOT_TAX = 10000;
export const DAY_SECONDS = 24 * 60 * 60;
export const FREEZE_NFT_DAYS = 20;

export const ATTRIBUTE_COMBINATIONS = [
  [false, false],
  [false, true],
  [true, false],
  [true, true],
];

export const getRarityShare = (numberOfCovers: number, rarity: string) => {
  const shareTable = getRarityShareTable(numberOfCovers);
  return shareTable.find((share) => share.rarity.toString() === rarity).value;
};
