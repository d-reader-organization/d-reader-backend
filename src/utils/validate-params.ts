import { PublicKey } from '@metaplex-foundation/js';
import { InstantBuyParams } from '../auction-house/dto/instant-buy-params.dto';
import { BadRequestException } from '@nestjs/common';

export const validateAndFormatParams = (
  instantBuyParams: InstantBuyParams[],
): InstantBuyParams[] => {
  let params: InstantBuyParams[];
  if (typeof instantBuyParams === 'string') {
    const param: InstantBuyParams = JSON.parse(instantBuyParams);
    validate(param);
    return [param];
  } else {
    params = instantBuyParams.map((val: any) => {
      const params: InstantBuyParams =
        typeof val === 'string' ? JSON.parse(val) : val;
      validate(params);
      return params;
    });
  }

  return params;
};

const validate = (param: InstantBuyParams) => {
  if (!param.buyerAddress || !PublicKey.isOnCurve(param.buyerAddress))
    throw new BadRequestException('Buyer Account must be a Solana address');
  if (!param.assetAddress || !PublicKey.isOnCurve(param.assetAddress))
    throw new BadRequestException('Mint Account must be a Solana address');
};
