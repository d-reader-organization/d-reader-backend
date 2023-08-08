import { PickType } from '@nestjs/swagger';
import { CreateComicIssueDto } from './create-comic-issue.dto';
import { IsInt, Min } from 'class-validator';

export class PublishOnChainDto extends PickType(CreateComicIssueDto, [
  'supply',
  'mintPrice',
  'discountMintPrice',
  'sellerFee',
  'royaltyWallets',
  'creatorAddress',
]) {
  // TODO: this should be a date string
  @Min(1)
  @IsInt()
  mintDuration: number;
}
