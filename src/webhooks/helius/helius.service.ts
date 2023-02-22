import { Injectable } from '@nestjs/common';
import { Cluster, Connection } from '@solana/web3.js';
import { EnrichedTransaction, Helius, TransactionType } from 'helius-sdk';
import { PrismaService } from 'nestjs-prisma';
import { clusterHeliusApiUrl } from 'src/utils/helius';
import { CreateHeliusCollectionWebhookDto } from './dto/create-helius-collection-webhook.dto';
import { CreateHeliusWebhookDto } from './dto/create-helius-webhook.dto';
import { UpdateHeliusWebhookDto } from './dto/update-helius-webhook.dto';

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

  createWebhook(payload: CreateHeliusWebhookDto) {
    return this.helius.createWebhook(payload);
  }

  createCollectionWebhook(createWebhookDto: CreateHeliusCollectionWebhookDto) {
    const y00ts = '4mKSoDDqApmF1DqXvVTSL6tu2zixrSSNjqMxUnwvVzy2';
    const deGods = '6XxjKYFbcndh2gDcsUrmZgVEsoDxXMnfsaGY6fpTJzNr';
    const okayBears = '3saAedkM9o5g1u5DCqsuMZuC4GRqPB4TuMkvSsSVvGQ3';
    const abc = 'ES2iF5ctjqvtopPn4n6K7c9fdHjYg41rYXL2XzJK37jF';

    // remove hardcoding
    createWebhookDto.collectionNftAddresses = [y00ts, deGods, okayBears, abc];

    return this.helius.createCollectionWebhook({
      accountAddresses: [],
      transactionTypes: createWebhookDto.transactionTypes,
      webhookURL: createWebhookDto.webhookURL,
      webhookType: createWebhookDto.webhookType,
      collectionQuery: {
        firstVerifiedCreators: undefined,
        verifiedCollectionAddresses: [y00ts, deGods, okayBears, abc],
      },
    });
  }

  updateWebhook(id: string, payload: UpdateHeliusWebhookDto) {
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
          case TransactionType.UPDATE_ITEM: // verify what should go here. // contact Josip
            return await this.updateCollectionNfts(enrichedTransaction);
          default:
            return;
        }
      }),
    );
  }

  // TODO: contact Josip, we will never update collectionNft
  // only collection items (comicIssueNfts)
  private updateCollectionNfts(enrichedTransaction: EnrichedTransaction) {
    const { fromUserAccount, toUserAccount } =
      enrichedTransaction.tokenTransfers.at(0);
    return this.prisma.comicIssueCollectionNft.update({
      where: {
        address: fromUserAccount,
      },
      data: { address: toUserAccount },
    });
  }

  private async mintAction(enrichedTransaction: EnrichedTransaction) {
    const payload = {
      address: enrichedTransaction.tokenTransfers.at(0).mint,
      candyMachineAddress: 'candyMachineAddress',
      collectionNftAddress: 'collectionNftAddress',
      name: 'name',
      owner: enrichedTransaction.tokenTransfers.at(0).toUserAccount,
      uri: 'uri',
    };

    // TODO: this might be unnecessary now
    const comicIssueCandyMachine =
      await this.prisma.comicIssueCandyMachine.findFirst({
        where: {
          address: payload.address,
        },
      });
    if (!comicIssueCandyMachine) {
      // TODO: throw Error('Unsupported candy machine')
    }

    // This should be done as a prisma $transaction!
    // e.g. what if (for whatever the reason) comicIssueNft.create fails?
    // It will still update the comicIssueCandyMachine with faulty increments/decrements
    // more details: https://www.prisma.io/docs/guides/performance-and-optimization/prisma-client-transactions-guide
    return Promise.all([
      this.prisma.comicIssueNft.create({ data: payload }),
      this.prisma.comicIssueCandyMachine.update({
        where: { address: payload.address },
        data: {
          itemsRemaining: { decrement: 1 },
          itemsMinted: { increment: 1 },
        },
      }),
    ]);
  }
}
