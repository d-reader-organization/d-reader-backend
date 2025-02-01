import { Request as ExpressRequest } from 'express';
import {
  JwtPayload,
  UserPayload,
  GoogleUserPayload,
} from '../auth/dto/authorization.dto';

export interface Request extends ExpressRequest {
  user?: JwtPayload;
}

export interface UserRequest extends ExpressRequest {
  user?: UserPayload;
}

export interface GoogleUserRequest extends ExpressRequest {
  user: GoogleUserPayload;
}
