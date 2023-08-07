import { Request as ExpressRequest } from 'express';
import { JwtPayload } from '../auth/dto/authorization.dto';

export interface Request extends ExpressRequest {
  user?: JwtPayload;
}
