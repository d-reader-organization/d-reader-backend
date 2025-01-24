import { type EmailWithMetadata, type Wallet } from '@privy-io/server-auth';

export enum EventType {
  userCreated = 'user.created',
  userAuthenticated = 'user.authenticated',
  userWalletCreated = 'user.wallet_created',
}

export type VerifiedPayload = {
  type?: EventType;
  user?: {
    linked_accounts?: (EmailWithMetadata & {
      first_verified_at: Date | null; // have to add property like this because privy prop firstVerifiedAt is always undefined
    })[];
  };
  wallet?: Wallet;
};
