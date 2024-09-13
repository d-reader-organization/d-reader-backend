import { ApiProperty, PickType } from '@nestjs/swagger';
import { CreateComicIssueDto } from './create-comic-issue.dto';
import {
  ArrayMaxSize,
  IsArray,
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { MAX_ON_CHAIN_TITLE_LENGTH } from '../../constants';
import { CouponType, TokenStandard } from '@prisma/client';
import { MAX_CREATOR_LIMIT } from '@metaplex-foundation/mpl-core-candy-machine';
import { RoyaltyWalletDto } from './royalty-wallet.dto';
import { Type } from 'class-transformer';
import { AddCandyMachineCouponCurrencySettingDto } from 'src/candy-machine/dto/add-coupon-currency-setting.dto';
import { TransformDateStringToDate } from '../../utils/transform';

export class CreateCandyMachineCouponDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsNumber()
  supply: number;

  @IsDate()
  @IsOptional()
  @TransformDateStringToDate()
  startsAt?: Date;

  @IsDate()
  @IsOptional()
  @TransformDateStringToDate()
  expiresAt?: Date;

  @IsOptional()
  @IsNumber()
  @Min(1)
  numberOfRedemptions?: number;

  @IsArray()
  @Type(() => AddCandyMachineCouponCurrencySettingDto)
  @ApiProperty({ type: [AddCandyMachineCouponCurrencySettingDto] })
  currencySettings: AddCandyMachineCouponCurrencySettingDto[];

  @IsEnum(CouponType)
  @ApiProperty({ enum: CouponType })
  type: CouponType;
}

export class PublishOnChainDto extends PickType(CreateComicIssueDto, [
  'sellerFeeBasisPoints',
  'creatorAddress',
]) {
  @IsString()
  @MaxLength(MAX_ON_CHAIN_TITLE_LENGTH)
  onChainName: string;

  @Min(10)
  @IsNumber()
  supply: number;

  @IsArray()
  @Type(() => CreateCandyMachineCouponDto)
  @ApiProperty({ type: [CreateCandyMachineCouponDto] })
  coupons: CreateCandyMachineCouponDto[];

  @IsOptional()
  @IsEnum(TokenStandard)
  @ApiProperty({ enum: TokenStandard, example: TokenStandard.Core })
  tokenStandard?: TokenStandard;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_CREATOR_LIMIT)
  @Type(() => RoyaltyWalletDto)
  @ApiProperty({ type: [RoyaltyWalletDto] })
  royaltyWallets?: RoyaltyWalletDto[];
}
