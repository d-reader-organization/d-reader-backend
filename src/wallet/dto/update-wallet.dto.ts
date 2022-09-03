import { PickType } from '@nestjs/swagger';
import { Wallet } from '../entities/wallet.entity';

export class UpdateWalletDto extends PickType(Wallet, ['role']) {}
