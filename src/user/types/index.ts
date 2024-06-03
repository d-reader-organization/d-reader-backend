import { Prisma } from '@prisma/client';

export type GetMeResult = Prisma.UserGetPayload<{
  include: { devices: true };
}>;
