import { User } from '@prisma/client';

export class Authorization {
  accessToken: string;
  refreshToken: string;
}

export type JwtDto = User & {
  /** Issued at */
  iat: number;
  /** Expiration time */
  exp: number;
};

// TokenPayload
