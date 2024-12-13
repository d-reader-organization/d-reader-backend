export const CachePath = Object.freeze({
  SupportedSplTokens: 'supported-spl-tokens',
  lookupTableAccounts: (address: string) => `lookupTableAccounts:${address}`,
  candyGuard: (address: string) => `candyGuard:${address}`,
  LatestBlockhash: 'latest-blockhash',
  COMIC_GET_MANY: '/comic/get?',
  COMIC_ISSUE_GET_MANY: '/comic-issue/get?',
  CREATOR_GET_MANY: '/creator/get?',
  GENRE_GET_MANY: '/genre/get?',
  CAROUSEL_SLIDE_GET_MANY: '/carousel/slides/get?',
  COMIC_ISSUE_GET_PUBLIC: (id: number) => `/comic-issue/get-public/${id}`,
  GLOBAL_RATE_LIMIT: (path: string) => `global-rate-limit:${path}`,
});
