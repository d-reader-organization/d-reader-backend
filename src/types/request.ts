import { Request as ExpressRequest } from 'express';
import { Wallet, Creator } from '@prisma/client';

export interface Request extends ExpressRequest {
  user?: Wallet & { creator?: Creator };
}
