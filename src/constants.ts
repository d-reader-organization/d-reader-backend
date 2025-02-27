import { ComicRarity } from 'dreader-comic-verse';
import { RarityShare } from './comic-issue/dto/types';
import { ComicRarity as PrismaComicRarity } from '@prisma/client';
import { ComputeBudgetProgram, PublicKey } from '@solana/web3.js';
import { CONFIG } from './configs/config';

export const MAX_NAME_LENGTH = 32;
export const MAX_URI_LENGTH = 200;
export const MAX_SYMBOL_LENGTH = 10;
export const MAX_CREATOR_LIMIT = 5;
export const MIN_SUPPLY_LIMIT = 5;

export const MAX_ON_CHAIN_TITLE_LENGTH = MAX_NAME_LENGTH - MIN_SUPPLY_LIMIT - 2;
export const D_READER_SYMBOL = 'dReader';
export const D_PUBLISHER_SYMBOL = 'dPublisher';

export const D_READER_FRONTEND_URL = 'https://www.dreader.app';

export const HUNDRED = 100;
export const HUNDRED_PERCENT_TAX = 10000;
export const MIN_MINT_PROTOCOL_FEE = 29000000;
export const MIN_CORE_MINT_PROTOCOL_FEE = 5500000;
// export const GLOBAL_BOT_TAX = 0.01;

export const USED_TRAIT = 'used';
export const SIGNED_TRAIT = 'signed';
export const DEFAULT_COMIC_ISSUE_USED = 'false';
export const DEFAULT_COMIC_ISSUE_IS_SIGNED = 'false';
export const RARITY_TRAIT = 'rarity';

export const LOW_VALUE = 127;
export const HIGH_VALUE = 16383;

export const MINT_COMPUTE_PRICE_WHICH_JOSIP_DEEMED_WORTHY = 600_000;
export const MINT_COMPUTE_UNITS = 700_000;
export const ALLOW_LIST_PROOF_COMPUTE_UNITS = 80_000;
export const ALLOW_LIST_PROOF_COMPUTE_PRICE = 80_00_000;

export const BUNDLR_ADDRESS =
  process.env.SOLANA_CLUSTER === 'devnet'
    ? 'https://devnet.bundlr.network'
    : 'https://node1.bundlr.network';

export const USERNAME_MIN_SIZE = 3;
export const USERNAME_MAX_SIZE = 20;
export const DISPLAY_NAME_MAX_SIZE = 48;
export const DISPLAY_NAME_MIN_SIZE = 3;

export const AUCTION_HOUSE_LOOK_UP_TABLE = new PublicKey(
  process.env.SOLANA_CLUSTER === 'mainnet-beta'
    ? '9TzbC21XGK682N3eXntxV4cpSWVra2QzT4T8kb2m3AJj'
    : '9GfMG415sgpzGajfTZyt7qcDo6Xxoa97MyxTFuHuY7od',
);
export const USERNAME_REGEX = new RegExp(/^[a-zA-Z0-9_čćžšđČĆŽŠĐ]+$/);

export const AUTHORITY_GROUP_LABEL = 'dAuth';
export const PUBLIC_GROUP_LABEL = 'public';
export const PUBLIC_GROUP_MINT_LIMIT = 2;
export const PUBLIC_GROUP_MINT_LIMIT_ID = 1;
export const REFERRAL_REWARD_THRESHOLD = 2; // minimum amount of verified users necessary to become eligible for a dRefer reward

export const THREE_RARITIES_SHARE: RarityShare[] = [
  {
    rarity: PrismaComicRarity.Common,
    value: 70,
  },
  {
    rarity: PrismaComicRarity.Rare,
    value: 25,
  },
  {
    rarity: PrismaComicRarity.Legendary,
    value: 5,
  },
];

export const FIVE_RARITIES_SHARE: RarityShare[] = [
  {
    rarity: PrismaComicRarity.Common,
    value: 60,
  },
  {
    rarity: PrismaComicRarity.Uncommon,
    value: 25,
  },
  {
    rarity: PrismaComicRarity.Rare,
    value: 10,
  },
  {
    rarity: PrismaComicRarity.Epic,
    value: 3,
  },
  {
    rarity: PrismaComicRarity.Legendary,
    value: 2,
  },
];

export const ONE_RARITY_SHARE: RarityShare[] = [
  {
    rarity: PrismaComicRarity.Common,
    value: 100,
  },
];

export const SOL_ADDRESS = 'So11111111111111111111111111111111111111112';
export const USDC_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

export const MIN_COMPUTE_PRICE = 600_000;
export const MIN_COMPUTE_PRICE_IX = ComputeBudgetProgram.setComputeUnitPrice({
  microLamports: MIN_COMPUTE_PRICE,
});

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
export const FREEZE_NFT_DAYS = 1;

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

export const minSupply = (numberOfRarities: number) => {
  const rarityShareTable = getRarityShareTable(numberOfRarities);
  const minShare = Math.min(
    ...rarityShareTable.map((rarityShare) => rarityShare.value),
  );
  const supply = Math.ceil(100 / minShare);
  return supply;
};

export const RARITY_MAP: { [key in PrismaComicRarity]: ComicRarity } = {
  [PrismaComicRarity.None]: ComicRarity.None,
  [PrismaComicRarity.Common]: ComicRarity.Common,
  [PrismaComicRarity.Uncommon]: ComicRarity.Uncommon,
  [PrismaComicRarity.Rare]: ComicRarity.Rare,
  [PrismaComicRarity.Epic]: ComicRarity.Epic,
  [PrismaComicRarity.Legendary]: ComicRarity.Legendary,
};

export const PASSWORD_MIN_SIZE = 8;
// export const PASSWORD_REGEX = new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
export const PASSWORD_LOWERCASE_REGEX = new RegExp(/^(?=.*[a-z]).+$/);
export const PASSWORD_UPPERCASE_REGEX = new RegExp(/^(?=.*[A-Z]).+$/);
export const PASSWORD_DIGIT_REGEX = new RegExp(/^(?=.*\d).+$/);

export const UNAUTHORIZED_MESSAGE = 'Authorization invalid or expired';

//Metaplex recommended ruleset (This is based on deny list)
export const AUTH_RULES = new PublicKey(
  'eBJLFYPxJmMGKuFwpDWkzxZeUrad92kZRC5BJLpzyT9',
);
export const AUTH_RULES_ID = new PublicKey(
  'auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg',
);

export const rateLimitQuota = {
  interval: 1000, // 1 second
  rate: 40, // 40 API calls per interval
  concurrency: 10, // no more than 10 running at once
};

export const LOCKED_COLLECTIONS = new Set([
  '2CvYjVeo69sYVi4ahKRDdbdYJRfdyuc1ES98auREAk9B',
  '7qdnJrEDmds4aFGDdUKyE7QjGEp7NX6NSsitJRLvfxi7',
  '8U8QqgDQW72W8iXpLJJ33F7xZvrHiDCujqXJ4WSamte9',
  'EUmjXBhULWuGwfwCDBGKFDuC8DGzo5iHhJNpXuAooYvD',
  'BNdPNtqsuMxyVQM9GhfAAJMUsiD1SzRAgQtV4FU8Go3k',
  'A7yZDHff1hGDpzn5LXATTNUJY7SEgEE51mos8ZTGXUjL',
]);

// Warning: Make sure to not touch these addresses without discussion.
export const FUNDS_DESTINATION_ADDRESS =
  process.env.SOLANA_CLUSTER === 'devnet'
    ? new PublicKey('BA6j4AW2SM7DmGg4HYRhKrXyFEqdhhFuLYjqWFUw1ZUV')
    : new PublicKey('ERyuU5aVyNvE4rbZngt8GpXNmtXex3TdyfxtceZzS5De');

export const CHANGE_COMIC_STATE_ACCOUNT_LEN = 13;
export const RARITY_PRECEDENCE = [
  'Common',
  'Uncommon',
  'Rare',
  'Epic',
  'Legendary',
];

export const TENSOR_GRAPHQL_API_ENDPOINT = 'https://api.tensor.so/graphql';
export const TENSOR_MAINNET_API_ENDPOINT = 'https://api.mainnet.tensordev.io';
export const TENSOR_TRADE_URL = 'https://www.tensor.trade/trade';

export const CMA_PROGRAM_ID = 'CMAGAKJ67e9hRZgfC5SFTbZH8MgEmtqazKXjmkaJjWTJ';
export const TCOMP_PROGRAM_ID = 'TCMPhJdwDryooaGtiocG1u3xcYbRpiJzb283XfCZsDp';
export const TSWAP_PROGRAM_ID = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN';

export const D_READER_AUCTION = 'DCoAH';

export const UPDATE_CORE_V1_DISCRIMINANT = 15;
export const TRANSFER_CORE_V1_DISCRIMINANT = 14;
export const BURN_CORE_V1_DISCRIMINANT = 12;
export const BURN_CORE_COLLECTION_V1_DISCRIMINANT = 13;
export const TRANSFER_LEGACY_DISCRIMINANT = 49;

export const MINT_CORE_V1_DISCRIMINATOR = [
  145, 98, 192, 118, 184, 147, 118, 104,
];
export const D_READER_AUCTION_SELL_DISCRIMINATOR = [
  51, 230, 133, 164, 1, 127, 131, 173,
];
export const D_READER_AUCTION_BID_DISCRIMINATOR = [
  102, 6, 61, 18, 1, 218, 235, 234,
];
export const D_READER_AUCTION_TIMED_SELL_DISCRIMINATOR = [
  252, 105, 35, 122, 230, 22, 164, 77,
];
export const D_READER_AUCTION_EXECUTE_SALE_DISCRIMINATOR = [
  37, 74, 217, 157, 79, 49, 35, 6,
];
export const D_READER_AUCTION_REPRICE_DISCRIMINATOR = [
  148, 156, 223, 202, 159, 184, 56, 232,
];
export const D_READER_AUCTION_CANCEL_BID_DISCRIMINATOR = [
  40, 243, 190, 217, 208, 253, 86, 206,
];
export const D_READER_AUCTION_CANCEL_LISTING_DISCRIMINATOR = [
  41, 183, 50, 232, 230, 233, 157, 70,
];
export const INIT_EDITION_SALE_DISCRIMINATOR = [
  21, 247, 63, 33, 206, 120, 250, 186,
];
export const BUY_EDITION_DISCRIMINATOR = [30, 208, 80, 182, 61, 221, 252, 249];

export const MINT_MUTEX_IDENTIFIER = 'Mint-Collectible-Comic';

/** This SkipThrottle config finds all throttler groups and constructs a 'skip' config for them */
export const SKIP_THROTTLERS_CONFIG: Record<string, boolean> =
  CONFIG.throttlers.reduce<Record<string, boolean>>((acc, throttler) => {
    if (!throttler.name) return acc;
    return { ...acc, [throttler.name]: true };
  }, {});

type ThrottlerConfigOptions = Record<string, { ttl?: number; limit: number }>;

/** This Throttle config overrides all throttler groups to decrease request limits */
export const STRICT_THROTTLER_CONFIG: ThrottlerConfigOptions = {
  short: { limit: 3 },
  default: { limit: 10 },
  medium: { limit: 15 },
  long: { limit: 30 },
};

/** This Throttle config overrides all throttler groups to increase request limits */
export const LOOSE_THROTTLER_CONFIG: ThrottlerConfigOptions = {
  short: { limit: 12 },
  default: { limit: 60 },
  medium: { limit: 120 },
  long: { limit: 240 },
};

export const DISCORD_AUTOGRAPH_CHANNEL_ID = '1179081739646275604';

// NOT TO BE CHANGED
export const COLLECTION_MANAGER_MULTISIG =
  process.env.SOLANA_CLUSTER === 'devnet'
    ? '5WXjY2qFMDg6hu2qgpHeQZwvKLLZsitXxtEYZeknA5Vu'
    : '6hij786bQQXrqF5Qd2iNkKsZqxEsoMGEoA139P4vcUgQ';

export const REFERRAL_CODE_KEY = 'ref';
