import { Injectable } from '@nestjs/common';
import { Cluster, Connection } from '@solana/web3.js';
import { Helius, TransactionType, WebhookType } from 'helius-sdk';
import { PrismaService } from 'nestjs-prisma';
import { clusterHeliusApiUrl } from 'src/utils/helius';

@Injectable()
export class HeliusService {
  private readonly connection: Connection;
  private readonly helius: Helius;

  constructor(private readonly prisma: PrismaService) {
    const endpoint = clusterHeliusApiUrl(
      process.env.HELIUS_API_KEY,
      process.env.SOLANA_CLUSTER as Cluster,
    );
    this.connection = new Connection(endpoint, 'confirmed');
    this.helius = new Helius(process.env.HELIUS_API_KEY);
  }

  createWebhook() {
    return this.helius.createWebhook({
      accountAddresses: ['7VZxFV9MDLnyEmF17jj9CZHrXajCoqoKdQwnQXn5dE9w'],
      transactionTypes: [TransactionType.ANY],
      webhookURL: 'https://07f8-5-133-138-103.eu.ngrok.io/helius/handle',
      //   authHeader: 'TODO',
      webhookType: WebhookType.ENHANCED,
    });
  }

  getMyWebhook(id: string) {
    return this.helius.getWebhookByID(id);
  }

  deleteWebhook(id: string) {
    return this.helius.deleteWebhook(id);
  }
}
