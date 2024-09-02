import { OmitType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';
import {
  TransformDateStringToDate,
  TransformStringToBoolean,
  TransformStringToNumber,
} from 'src/utils/transform';

export class ListParams {
  @IsSolanaAddress()
  assetAddress: string;

  @TransformStringToNumber()
  @IsNumber()
  price: number;

  @IsString()
  splTokenAddress: string;
}

export class TimedAuctionListParams extends OmitType(ListParams, [
  'price',
] as const) {
  @TransformDateStringToDate()
  @IsDate()
  startDate: Date;

  @TransformDateStringToDate()
  @IsDate()
  endDate: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reservePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minBidIncrement?: number;

  @IsOptional()
  @TransformStringToBoolean()
  @IsBoolean()
  allowHighBidCancel?: boolean;
}
