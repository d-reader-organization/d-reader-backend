import { ApiProperty, PickType } from '@nestjs/swagger';
import { Wallet } from '../entities/wallet.entity';

export class UpdateWalletDto extends PickType(Wallet, ['name', 'role']) {
  @ApiProperty({ type: 'string', format: 'binary', required: false })
  avatar: Express.Multer.File | null;
}
