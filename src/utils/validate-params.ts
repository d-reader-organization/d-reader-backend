import { PublicKey } from '@metaplex-foundation/js';
import { InstantBuyParams } from '../auction-house/dto/instant-buy-params.dto';
import { BadRequestException } from '@nestjs/common';

export const validateAndFormatParams = (
  instantBuyParams: InstantBuyParams[],
): InstantBuyParams[] => {
  let params: InstantBuyParams[] | InstantBuyParams;

  if (typeof instantBuyParams === 'string') {
    params = JSON.parse(instantBuyParams);
  } else {
    params = instantBuyParams;
  }

  if (Array.isArray(params)) {
    const paramsArray = params.map((val: any) => {
      const param: InstantBuyParams =
        typeof val === 'string' ? JSON.parse(val) : val;
      validate(param);
      return param;
    });

    return paramsArray;
  } else if (typeof params === 'object') {
    validate(params);
    return [params];
  }
  throw new BadRequestException('Invalid input format for instantBuyParams');
};

const validate = (param: InstantBuyParams) => {
  if (!param.buyerAddress || !PublicKey.isOnCurve(param.buyerAddress))
    throw new BadRequestException('Buyer Account must be a Solana address');
  if (!param.assetAddress || !PublicKey.isOnCurve(param.assetAddress))
    throw new BadRequestException('Mint Account must be a Solana address');
};
