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

// TODO v2: in the future this will vary 10-20% depending on the type of comic
// we will have to create a simple function with a switch case `calculatePublisherCut`
export const D_PUBLISHER_PRIMARY_SALE_SHARE = 10;
export const D_PUBLISHER_SECONDARY_SALE_SHARE = 25;

// export const GLOBAL_BOT_TAX = 0.01;

export const USED_TRAIT = 'used';
export const SIGNED_TRAIT = 'signed';
export const DEFAULT_COMIC_ISSUE_USED = 'false';
export const DEFAULT_COMIC_ISSUE_IS_SIGNED = 'false';
