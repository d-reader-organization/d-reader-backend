import { IsOptional } from 'class-validator';
import { TransactionType } from 'helius-sdk';

export class UpdateWebhookDto {
  @IsOptional()
  accountAddresses?: string[];

  @IsOptional()
  transactionTypes?: TransactionType[];

  @IsOptional()
  webhookUrl?: string;
}
