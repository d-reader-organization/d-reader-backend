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
  @Min(1)
  @IsInt()
  mintDuration: number;
}
