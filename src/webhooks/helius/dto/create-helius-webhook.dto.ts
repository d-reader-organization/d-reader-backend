import { PickType } from '@nestjs/swagger';
import { HeliusWebhookDto } from './helius-webhook.dto';

export class CreateHeliusWebhookDto extends PickType(HeliusWebhookDto, [
  'webhookURL',
  'accountAddresses',
]) {}
