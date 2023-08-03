import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';

export class InstantBuyParams {
  @IsSolanaAddress()
  buyerAddress: string;

  @IsSolanaAddress()
  mintAccount: string;

  @IsNumberString()
  price: number;

  @IsSolanaAddress()
  sellerAddress: string;
}

export class BuyParamsArray {
  @ApiProperty({
    isArray: true,
    type: InstantBuyParams,
  })
  instantBuyParams: InstantBuyParams[];
}
