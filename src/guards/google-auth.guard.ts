import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  UseGuards,
  applyDecorators,
} from '@nestjs/common';
import { Request } from 'express';
import { UNAUTHORIZED_MESSAGE } from '../constants';
import { GoogleAuthService } from '../third-party/google-auth/google-auth.service';

@Injectable()
export class GoogleAuthGuard implements CanActivate {
  constructor(private googleAuthService: GoogleAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      const isValid = await this.googleAuthService.isValidGoogleToken(token);
      if (!isValid) {
        throw new BadRequestException('Malformed or expired token');
      }
      const googleUser = await this.googleAuthService.extractUserFromToken(
        token,
      );
      request['user'] = googleUser;
    } catch {
      throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Google' ? token : undefined;
  }
}

export function GoogleUserAuth() {
  return applyDecorators(UseGuards(GoogleAuthGuard));
}
