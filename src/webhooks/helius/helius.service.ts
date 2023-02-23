import { Injectable } from '@nestjs/common';
import { Cluster, Connection } from '@solana/web3.js';
import { EnrichedTransaction, Helius, TransactionType } from 'helius-sdk';
import { PrismaService } from 'nestjs-prisma';
import { clusterHeliusApiUrl } from 'src/utils/helius';
import { CreateHeliusCollectionWebhookDto } from './dto/create-helius-collection-webhook.dto';
import { CreateHeliusWebhookDto } from './dto/create-helius-webhook.dto';
import { UpdateHeliusWebhookDto } from './dto/update-helius-webhook.dto';
import { v4 as uuidv4 } from 'uuid';

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
    return this.helius.createCollectionWebhook({
      accountAddresses: undefined,
      transactionTypes: createWebhookDto.transactionTypes,
      webhookURL: createWebhookDto.webhookURL,
      webhookType: createWebhookDto.webhookType,
      collectionQuery: {
        firstVerifiedCreators: undefined,
        verifiedCollectionAddresses: createWebhookDto.collectionNftAddresses,
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
          case (TransactionType.NFT_MINT, TransactionType.TOKEN_MINT):
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
      candyMachineAddress: 'A3UgZc39HZbDiiDB24vjgNdmnV43RGznRavFkj5sJ68c',
      collectionNftAddress: '68gsxWrLkMkwMznXM9qam7FvDK1SDBhVJZaQUpAwXL6k',
      name: uuidv4(),
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
