import { PublicKey } from '@metaplex-foundation/js';
import { InstantBuyParams } from '../auction-house/dto/instant-buy-params.dto';
import { BadRequestException } from '@nestjs/common';
import { BuyArgs } from '../auction-house/dto/types/buy-args';

export const validateAndFormatParams = (
  instantBuyParams: InstantBuyParams[],
): BuyArgs[] => {
  let buyParams: BuyArgs[];
  if (typeof instantBuyParams === 'string') {
    const param: InstantBuyParams = JSON.parse(instantBuyParams);
    validate(param);
    return [format(param)];
  } else {
    buyParams = instantBuyParams.map((val: any) => {
      const params: InstantBuyParams =
        typeof val === 'string' ? JSON.parse(val) : val;
      validate(params);
      return format(params);
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

const format = (param: InstantBuyParams): BuyArgs => {
  return {
    mintAccount: new PublicKey(param.mintAccount),
    price: +param.price,
    seller: new PublicKey(param.seller),
  };
};
