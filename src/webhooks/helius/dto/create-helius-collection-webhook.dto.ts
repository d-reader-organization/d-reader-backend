import { ApiProperty, OmitType } from '@nestjs/swagger';
import { IsArray } from 'class-validator';
import { CreateHeliusWebhookDto } from './create-helius-webhook.dto';

export class CreateHeliusCollectionWebhookDto extends OmitType(
  CreateHeliusWebhookDto,
  ['accountAddresses'],
) {
  // TODO: validate is array of solana addresses
  @IsArray()
  @ApiProperty({ default: [] })
  collectionNftAddresses: string[];
}
