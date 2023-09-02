import { Transform } from 'class-transformer';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';

export class TipCreatorParams {
  @Transform(({ value }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  creatorId: number;

  @Transform(({ value }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  tipAmount: number;

  @IsSolanaAddress()
  splTokenAddress: string;
}
