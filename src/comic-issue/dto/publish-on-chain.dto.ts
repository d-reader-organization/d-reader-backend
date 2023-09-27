import { PickType } from '@nestjs/swagger';
import { CreateComicIssueDto } from './create-comic-issue.dto';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { IsLamport } from 'src/decorators/IsLamport';

export class PublishOnChainDto extends PickType(CreateComicIssueDto, [
  'sellerFee',
  'royaltyWallets',
  'creatorAddress',
]) {
  @IsOptional()
  @IsLamport()
  mintPrice?: number;

  @Min(0)
  // @IsDivisibleBy(100)
  @IsNumber()
  supply?: number;

  @IsDateString()
  startDate: Date;

  @IsDateString()
  endDate: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  publicMintLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  freezePeriod?: number;
}
