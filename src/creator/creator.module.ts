import { Module } from '@nestjs/common';
import { CreatorService } from './creator.service';
import { CreatorController } from './creator.controller';
import { UserCreatorService } from './user-creator.service';
import { PasswordService } from '../auth/password.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [CreatorController],
  providers: [
    CreatorService,
    UserCreatorService,
    PasswordService,
    MailService,
    AuthService,
    JwtService,
  ],
})
export class CreatorModule {}
