import { ApiProperty } from '@nestjs/swagger';
import { plainToInstance, Type } from 'class-transformer';
import { IsArray, IsEnum, IsUrl, IsOptional, IsString } from 'class-validator';
import { TransactionType, Webhook, WebhookType } from 'helius-sdk';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';

export class HeliusWebhookDto {
  @IsString()
  webhookID: string;

  @IsSolanaAddress()
  wallet: string;

  @IsArray()
  @Type(() => String)
  // TODO: validate is array of solana addresses
  accountAddresses: string[];

  @IsArray()
  @Type(() => String)
  @ApiProperty({ default: [TransactionType.ANY] })
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
