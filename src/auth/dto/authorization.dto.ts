import { User, Creator } from '@prisma/client';

export class Authorization {
  accessToken: string;
  refreshToken: string;
}

export type UserPayload = User & {
  type: 'user';
};

export type CreatorPayload = Creator & {
  type: 'creator';
};

export type JwtPayload = UserPayload | CreatorPayload;

export type JwtDto = JwtPayload & {
  /** Issued at */
  iat: number;
  /** Expiration time */
  exp: number;
};

// TokenPayload
