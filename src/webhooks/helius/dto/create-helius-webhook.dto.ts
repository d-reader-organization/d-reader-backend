import { OmitType } from '@nestjs/swagger';
import { HeliusWebhookDto } from './helius-webhook.dto';

export class CreateHeliusWebhookDto extends OmitType(HeliusWebhookDto, [
  'webhookID',
  'wallet',
]) {}
