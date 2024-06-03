import { Module } from '@nestjs/common';
import { GoogleAuthService } from './google-auth.service';

@Module({
  providers: [GoogleAuthService],
})
export class GoogleAuthModule {}
