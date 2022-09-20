import { PickType } from '@nestjs/swagger';
import { WalletDto } from './wallet.dto';

export class CreateWalletDto extends PickType(WalletDto, ['address']) {}
