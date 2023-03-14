import { PickType } from '@nestjs/swagger';
import { CreateComicIssueDto } from './create-comic-issue.dto';

export class PublishOnChainDto extends PickType(CreateComicIssueDto, [
  'supply',
  'mintPrice',
  'discountMintPrice',
]) {}
