import { ApiProperty, PickType } from '@nestjs/swagger';
import { CreateComicIssueDto } from './create-comic-issue.dto';
import {
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

export class PublishOnChainDto extends PickType(CreateComicIssueDto, [
  'sellerFeeBasisPoints',
  'royaltyWallets',
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
}
