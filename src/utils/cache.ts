export const CachePath = Object.freeze({
  SupportedSplTokens: 'supported-spl-tokens',
  lookupTableAccounts: (address: string) => `lookupTableAccounts:${address}`,
  candyGuard: (address: string) => `candyGuard:${address}`,
});
