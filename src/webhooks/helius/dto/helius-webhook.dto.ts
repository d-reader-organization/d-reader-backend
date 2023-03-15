import { ApiProperty } from '@nestjs/swagger';
import { plainToInstance, Type } from 'class-transformer';
import { TransactionType, Webhook, WebhookType } from 'helius-sdk';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';
import {
  IsArray,
  IsEnum,
  IsUrl,
  IsOptional,
  IsString,
  ArrayNotEmpty,
} from 'class-validator';

export class HeliusWebhookDto {
  @IsString()
  webhookID: string;

  @IsSolanaAddress()
  wallet: string;

  @IsArray()
  @ArrayNotEmpty()
  @Type(() => String)
  accountAddresses: string[];

  @IsArray()
  @Type(() => String)
  @ApiProperty({ default: [TransactionType.ANY] })
  transactionTypes: string[];

  @IsUrl()
  webhookURL: string;

  // @IsEnum(WebhookType)
  // @ApiProperty({ enum: WebhookType })
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
