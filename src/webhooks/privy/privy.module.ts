import { Module } from '@nestjs/common';
import { PrivyService } from './privy.service';
import { PrivyController } from './privy.controller';
import { WalletService } from 'src/wallet/wallet.service';
import { PasswordService } from 'src/auth/password.service';
import { HeliusService } from '../helius/helius.service';
import { NonceService } from 'src/nonce/nonce.service';
import { CandyMachineService } from 'src/candy-machine/candy-machine.service';

@Module({
  controllers: [PrivyController],
  providers: [
    PrivyService,
    PasswordService,
    HeliusService,
    NonceService,
    WalletService,
    CandyMachineService,
  ],
})
export class PrivyModule {}
