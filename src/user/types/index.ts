import { Prisma } from '@prisma/client';

export type GetMeResult = { referralUsed?: number } & Prisma.UserGetPayload<{
  include: { devices: true };
}>;
