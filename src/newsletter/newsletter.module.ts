import { Module } from '@nestjs/common';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';
import { PasswordService } from '../auth/password.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule],
  controllers: [NewsletterController],
  providers: [
    NewsletterService,
    MailService,
    AuthService,
    PasswordService,
    JwtService,
  ],
})
export class NewsletterModule {}
