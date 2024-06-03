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
  if (!param.buyerAddress || !PublicKey.isOnCurve(param.buyerAddress))
    throw new BadRequestException('Buyer Account must be a Solana address');
  if (!param.mintAccount || !PublicKey.isOnCurve(param.mintAccount))
    throw new BadRequestException('Mint Account must be a Solana address');
};

const format = (param: InstantBuyParams): BuyArgs => {
  return {
    buyer: new PublicKey(param.buyerAddress),
    mintAccount: new PublicKey(param.mintAccount),
  };
};
