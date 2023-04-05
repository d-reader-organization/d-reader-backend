import { PublicKey } from '@metaplex-foundation/js';
import { InstantBuyParams } from '../auction-house/dto/instant-buy-params.dto';
import { BadRequestException } from '@nestjs/common';
import { BuyArgs } from '../auction-house/dto/types/buyArgs';

export const validateAndFormatParams = (
  instantBuyParams: InstantBuyParams[],
) => {
  let buyParams: BuyArgs[];
  if (typeof instantBuyParams === 'string') {
    const params: InstantBuyParams = JSON.parse(instantBuyParams);
    validate(params);
    return [
      {
        mintAccount: new PublicKey(params.mintAccount),
        price: +params.price,
        seller: new PublicKey(params.seller),
      },
    ];
  } else {
    buyParams = instantBuyParams.map((val: any) => {
      const params: InstantBuyParams =
        typeof val === 'string' ? JSON.parse(val) : val;
      validate(params);
      return {
        mintAccount: new PublicKey(params.mintAccount),
        price: +params.price,
        seller: new PublicKey(params.seller),
      };
    });
  }

  return buyParams;
};

const validate = (param: InstantBuyParams) => {
  if (!param.mintAccount || !PublicKey.isOnCurve(param.mintAccount))
    throw new BadRequestException('Mint Account must be a Solana address');
  if (!param.seller || !PublicKey.isOnCurve(param.seller))
    throw new BadRequestException('Seller must be a Solana address');
  if (param.price < 0)
    throw new BadRequestException('price should be greater than or equal to 0');
};
