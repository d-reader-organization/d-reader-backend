import { ApiProperty } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { IsArray, IsEnum, IsUrl, IsOptional, IsString } from 'class-validator';
import { TransactionType, Webhook, WebhookType } from 'helius-sdk';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';

export class HeliusWebhookDto {
  @IsString()
  webhookID: string;

  @IsSolanaAddress()
  wallet: string;

  @IsArray()
  // TODO: validate is array of solana addresses
  accountAddresses: string[];

  @IsString()
  @ApiProperty({ enum: TransactionType, default: TransactionType.ANY })
  transactionTypes: string[];

  @IsUrl()
  webhookURL: string;

  @IsEnum(WebhookType)
  @ApiProperty({ enum: WebhookType })
  @IsOptional()
  webhookType?: WebhookType;

  @IsString()
  @IsOptional()
  authHeader?: string;
}

export function toHeliusWebhookDto(heliusWebhook: Webhook) {
  const heliusWebhookDto = plainToInstance(HeliusWebhookDto, heliusWebhook);
  return heliusWebhookDto;
}

export const toWalletDtoArray = (webhooks: Webhook[]) => {
  return Promise.all(webhooks.map(toHeliusWebhookDto));
};
