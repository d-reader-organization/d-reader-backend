import { ApiProperty, OmitType } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray } from 'class-validator';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';
import { CreateHeliusWebhookDto } from './create-helius-webhook.dto';

export class CreateHeliusCollectionWebhookDto extends OmitType(
  CreateHeliusWebhookDto,
  ['accountAddresses'],
) {
  @IsArray()
  @ArrayNotEmpty()
  @IsSolanaAddress({ each: true })
  @ApiProperty({ default: [] })
  collectionNftAddresses: string[];
}
