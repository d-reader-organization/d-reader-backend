import { ApiProperty } from '@nestjs/swagger';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';

export class InstantBuyParams {
  @IsSolanaAddress()
  buyerAddress: string;

  @IsSolanaAddress()
  assetAddress: string;
}

export class MultipleBuyParams {
  @ApiProperty({
    isArray: true,
    type: InstantBuyParams,
  })
  instantBuyParamsArray: InstantBuyParams[];
}
