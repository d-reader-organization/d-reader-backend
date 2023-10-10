import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { TransformStringToNumber } from 'src/utils/transform';

export class InstantBuyParams {
  @IsSolanaAddress()
  buyerAddress: string;

  @IsSolanaAddress()
  mintAccount: string;

  @TransformStringToNumber()
  @IsNumber()
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
