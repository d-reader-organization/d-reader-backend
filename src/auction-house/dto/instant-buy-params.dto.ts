import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString } from 'class-validator';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';

export class InstantBuyParams {
  @IsSolanaAddress()
  mintAccount: string;

  @IsNumberString()
  price: number;

  @IsSolanaAddress()
  seller: string;
}

export class BuyParamsArray {
  @ApiProperty({
    isArray: true,
    type: InstantBuyParams,
  })
  instantBuyParams: InstantBuyParams[];
}
