import { Request as ExpressRequest } from 'express';
import {
  JwtPayload,
  UserPayload,
  CreatorPayload,
} from '../auth/dto/authorization.dto';

export interface Request extends ExpressRequest {
  user?: JwtPayload;
}

export interface UserRequest extends ExpressRequest {
  user?: UserPayload;
}

export interface CreatorRequest extends ExpressRequest {
  user?: CreatorPayload;
}
