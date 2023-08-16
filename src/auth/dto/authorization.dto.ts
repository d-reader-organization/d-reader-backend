import { User, Creator } from '@prisma/client';

export class Authorization {
  accessToken: string;
  refreshToken: string;
}

export type UserPayload = {
  type: 'user';
  id: User['id'];
  email: User['email'];
  name: User['name'];
  role: User['role'];
};

export type CreatorPayload = {
  type: 'creator';
  id: Creator['id'];
  email: Creator['email'];
  name: Creator['name'];
};

export type JwtPayload = UserPayload | CreatorPayload;

export type JwtDto = JwtPayload & {
  /** Issued at */
  iat: number;
  /** Expiration time */
  exp: number;
};

export type EmailJwtDto = {
  email: string;
  iat: number;
  exp: number;
};
