import { PickType } from '@nestjs/swagger';
import { CreateComicIssueBodyDto } from './create-comic-issue.dto';
import { IsDateString } from 'class-validator';

export class PublishOnChainDto extends PickType(CreateComicIssueBodyDto, [
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
}
