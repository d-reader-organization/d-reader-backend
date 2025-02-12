import { User } from '@prisma/client';

export class Authorization {
  accessToken: string;
  refreshToken: string;
}

export type BaseJwtPayload = {
  /** Issued at */
  iat: number;
  /** Expiration time */
  exp: number;
};

export type UserPayload = {
  id: User['id'];
  email: User['email'];
  username: User['username'];
  role: User['role'];
};

export type GoogleUserPayload = {
  type: 'google';
  id?: string;
  email: string;
  name?: string;
  given_name?: string;
  family_name?: string;
};

export type JwtPayload = UserPayload;
export type JwtDto = JwtPayload & BaseJwtPayload;

export type EmailPayload = {
  email: string;
  id: number; // user or creator id
};
export type EmailJwtDto = EmailPayload & BaseJwtPayload;
