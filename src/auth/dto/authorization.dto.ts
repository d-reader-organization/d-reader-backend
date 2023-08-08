import { User, Creator } from '@prisma/client';

export class Authorization {
  accessToken: string;
  refreshToken: string;
}

// We're creating these types to ensure type safety
// In case schema.prisma ever goes through critical changes...
// these types will make sure compiler breaks and throws a tantrum
type UserPayload = {
  id: User['id'];
  email: User['email'];
  name: User['name'];
  role?: User['role'];
};

type CreatorPayload = {
  id: Creator['id'];
  email: Creator['email'];
  name: Creator['name'];
};

export type EntityType = 'user' | 'creator';
export type JwtPayload = (UserPayload & CreatorPayload) & { type: EntityType };

export type JwtDto = JwtPayload & {
  /** Issued at */
  iat: number;
  /** Expiration time */
  exp: number;
};

// TokenPayload
