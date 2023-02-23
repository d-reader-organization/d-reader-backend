import { PartialType } from '@nestjs/swagger';
import { CreateHeliusWebhookDto } from './create-helius-webhook.dto';

export class UpdateHeliusWebhookDto extends PartialType(
  CreateHeliusWebhookDto,
) {}
