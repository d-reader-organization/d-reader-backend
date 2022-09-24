import { Wallet } from '@prisma/client';

export class Authorization {
  accessToken: string;
  refreshToken: string;
}

export type JwtDto = Wallet & {
  /**
   * Issued at
   */
  iat: number;
  /**
   * Expiration time
   */
  exp: number;
};

// TokenPayload
