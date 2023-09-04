import { PickType } from '@nestjs/swagger';
import { CreateComicIssueDto } from './create-comic-issue.dto';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class PublishOnChainDto extends PickType(CreateComicIssueDto, [
  'supply',
  'mintPrice',
  'discountMintPrice',
  'sellerFee',
  'royaltyWallets',
  'creatorAddress',
]) {
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
