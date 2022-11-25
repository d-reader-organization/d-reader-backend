import { PickType } from '@nestjs/swagger';
import { NewsletterDto } from './newsletter.dto';

export class UpsertNewsletterDto extends PickType(NewsletterDto, [
  'email',
  'wantsDevelopmentProgressNews',
  'wantsPlatformContentNews',
  'wantsFreeNFTs',
]) {}
