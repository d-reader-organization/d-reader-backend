import { ApiProperty, PickType } from '@nestjs/swagger';
import { CreateComicIssueDto } from './create-comic-issue.dto';
import {
  ArrayMaxSize,
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { IsLamport } from '../../decorators/IsLamport';
import { TransformDateStringToDate } from '../../utils/transform';
import { MAX_ON_CHAIN_TITLE_LENGTH } from '../../constants';
import { TokenStandard, WhiteListType } from '@prisma/client';
import { MAX_CREATOR_LIMIT } from '@metaplex-foundation/mpl-core-candy-machine';
import { RoyaltyWalletDto } from './royalty-wallet.dto';
import { Type } from 'class-transformer';

export class PublishOnChainDto extends PickType(CreateComicIssueDto, [
  'sellerFeeBasisPoints',
  'creatorAddress',
]) {
  @IsString()
  @MaxLength(MAX_ON_CHAIN_TITLE_LENGTH)
  onChainName: string;

  @IsLamport()
  mintPrice: number;

  @Min(10)
  @IsNumber()
  supply: number;

  @IsDate()
  @TransformDateStringToDate()
  startDate: Date;

  @IsDate()
  @IsOptional()
  @TransformDateStringToDate()
  endDate?: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  publicMintLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  freezePeriod?: number;

  @IsOptional()
  @IsEnum(TokenStandard)
  @ApiProperty({ enum: TokenStandard })
  tokenStandard?: TokenStandard;

  @IsOptional()
  @IsEnum(WhiteListType)
  @ApiProperty({ enum: WhiteListType })
  whiteListType?: WhiteListType;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_CREATOR_LIMIT)
  @Type(() => RoyaltyWalletDto)
  @ApiProperty({ type: [RoyaltyWalletDto] })
  royaltyWallets?: RoyaltyWalletDto[];
}
