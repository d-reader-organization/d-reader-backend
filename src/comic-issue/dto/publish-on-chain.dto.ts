import { PickType } from '@nestjs/swagger';
import { CreateComicIssueDto } from './create-comic-issue.dto';
import {
  IsBoolean,
  IsDate,
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

export class PublishOnChainDto extends PickType(CreateComicIssueDto, [
  'sellerFeeBasisPoints',
  'royaltyWallets',
  'creatorAddress',
]) {
  @IsString()
  @MaxLength(MAX_ON_CHAIN_TITLE_LENGTH)
  onChainName: string;

  @IsOptional()
  @IsLamport()
  mintPrice?: number;

  @Min(0)
  // @IsDivisibleBy(100)
  @IsNumber()
  supply?: number;

  @IsDate()
  @IsOptional()
  @TransformDateStringToDate()
  startDate?: Date;

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
  @IsBoolean()
  shouldBePublic?: boolean;
}
