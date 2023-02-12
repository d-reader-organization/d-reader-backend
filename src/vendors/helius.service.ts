import { Injectable } from '@nestjs/common';
import { Connection } from '@solana/web3.js';
import { Helius, TransactionType, WebhookType } from 'helius-sdk';
import { PrismaService } from 'nestjs-prisma';

@Injectable()
export class HeliusService {
  private readonly connection: Connection;
  private readonly helius: Helius;

  constructor(private readonly prisma: PrismaService) {
    this.connection = new Connection(
      process.env.SOLANA_RPC_NODE_ENDPOINT,
      'confirmed',
    );

    this.helius = new Helius(process.env.HELIUS_API_KEY);
  }

  async createWebhook() {
    const result = await this.helius.createWebhook({
      accountAddresses: ['7aLBCrbn4jDNSxLLJYRRnKbkqA5cuaeaAzn74xS7eKPD'],
      transactionTypes: [TransactionType.ANY],
      webhookURL:
        'https://f274-93-141-253-1.eu.ngrok.io/playground/helius/webhooks/receive',
      //   authHeader: 'TODO',
      webhookType: WebhookType.ENHANCED,
    });

    return result;
  }

  async getMyWebhook() {
    const result = await this.helius.getWebhookByID(
      '2d2a6b9c-8597-4dab-987b-dd9a6778fad8',
    );

    return result;
  }
}
