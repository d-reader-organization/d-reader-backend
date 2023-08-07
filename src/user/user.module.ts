import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { WalletService } from '../wallet/wallet.service';
import { PasswordService } from '../auth/password.service';
import { MailService } from '../mail/mail.service';

@Module({
  controllers: [UserController],
  providers: [UserService, WalletService, PasswordService, MailService],
})
export class UserModule {}
