import { Request as ExpressRequest } from 'express';
import { User, Creator } from '@prisma/client';

export interface Request extends ExpressRequest {
  user?: User & { creator?: Creator };
}
