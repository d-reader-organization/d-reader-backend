import { Module } from '@nestjs/common';
import { WheelController } from './wheel.controller';
import { WheelService } from './wheel.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from '../auth/auth.service';
// import { JwtStrategy } from '../auth/jwt.strategy';
import { PasswordService } from '../auth/password.service';
import { JwtService } from '@nestjs/jwt';
import { WalletService } from '../wallet/wallet.service';
import { HeliusService } from '../webhooks/helius/helius.service';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { NonceService } from 'src/nonce/nonce.service';

@Module({
  controllers: [WheelController],
  providers: [
    WheelService,
    MailService,
    AuthService,
    PasswordService,
    JwtService,
    WalletService,
    HeliusService,
    CandyMachineService,
    NonceService,
  ],
})
export class WheelModule {}
