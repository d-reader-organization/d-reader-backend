import { Injectable } from '@nestjs/common';
import { Cluster, Connection } from '@solana/web3.js';
import {
  EnrichedTransaction,
  Helius,
  TransactionType,
  WebhookType,
} from 'helius-sdk';
import { PrismaService } from 'nestjs-prisma';
import { clusterHeliusApiUrl } from 'src/utils/helius';
import { UpdateWebhookDto } from './dto/update-helius-webhook.dto';
import uuid from 'uuid';

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
      transactionTypes: [TransactionType.NFT_MINT],
      webhookURL: 'https://46ff-5-133-138-103.eu.ngrok.io/helius/handle',
      //   authHeader: 'TODO',
      webhookType: WebhookType.ENHANCED,
    });
  }

  createCollectionWebhook() {
    // finish this
    return this.helius.createCollectionWebhook({
      accountAddresses: [''],
      transactionTypes: [TransactionType.ANY],
      webhookURL: 'https://46ff-5-133-138-103.eu.ngrok.io/helius/handle',
      webhookType: WebhookType.ENHANCED,
      collectionQuery: {
        firstVerifiedCreators: [],
        verifiedCollectionAddresses: [],
      },
    });
  }

  updateWebhook(id: string, payload: UpdateWebhookDto) {
    return this.helius.editWebhook(id, payload);
  }

  getMyWebhook(id: string) {
    return this.helius.getWebhookByID(id);
  }

  deleteWebhook(id: string) {
    return this.helius.deleteWebhook(id);
  }

  handleWebhookEvent(data: EnrichedTransaction[]) {
    return Promise.all(
      data.map(async (enrichedTransaction) => {
        switch (enrichedTransaction.type) {
          case TransactionType.NFT_MINT:
            return await this.mintAction(enrichedTransaction);
          case TransactionType.ANY:
            return this.updateComicIssueNfts(enrichedTransaction);
          default:
            return;
        }
      }),
    );
  }

  private updateComicIssueNfts(enrichedTransaction: EnrichedTransaction) {
    console.log(enrichedTransaction);
    // owner has changed, update owner?
  }

  private async mintAction(enrichedTransaction: EnrichedTransaction) {
    const payload = {
      address: enrichedTransaction.tokenTransfers.at(0).mint,
      candyMachineAddress: 'candyMachineAddress',
      collectionNftAddress: 'collectionNftAddress',
      name: uuid.v4(),
      owner: enrichedTransaction.tokenTransfers.at(0).toUserAccount,
      uri: 'uri',
    };

    const comicIssueCandyMachine =
      await this.prisma.comicIssueCandyMachine.findFirst({
        where: {
          address: payload.candyMachineAddress,
        },
      });
    if (!comicIssueCandyMachine) {
      throw Error('Unsupported candy machine');
    }

    const createComicIssueNft = this.prisma.comicIssueNft.create({
      data: payload,
    });
    const updateComicIssueCandyMachine =
      this.prisma.comicIssueCandyMachine.update({
        where: { address: payload.candyMachineAddress },
        data: {
          itemsRemaining: { decrement: 1 },
          itemsMinted: { increment: 1 },
        },
      });

    await this.prisma.$transaction([
      createComicIssueNft,
      updateComicIssueCandyMachine,
    ]);
  }
}
