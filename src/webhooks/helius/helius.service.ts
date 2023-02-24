import { Injectable } from '@nestjs/common';
import { Cluster, Connection, PublicKey } from '@solana/web3.js';
import { EnrichedTransaction, Helius, TransactionType } from 'helius-sdk';
import { PrismaService } from 'nestjs-prisma';
import { clusterHeliusApiUrl } from 'src/utils/helius';
import { CreateHeliusCollectionWebhookDto } from './dto/create-helius-collection-webhook.dto';
import { CreateHeliusWebhookDto } from './dto/create-helius-webhook.dto';
import { UpdateHeliusWebhookDto } from './dto/update-helius-webhook.dto';
import { Metaplex } from '@metaplex-foundation/js';

@Injectable()
export class HeliusService {
  private readonly connection: Connection;
  private readonly helius: Helius;
  private readonly metaplex: Metaplex;

  constructor(private readonly prisma: PrismaService) {
    const endpoint = clusterHeliusApiUrl(
      process.env.HELIUS_API_KEY,
      process.env.SOLANA_CLUSTER as Cluster,
    );
    this.connection = new Connection(endpoint, 'confirmed');
    this.helius = new Helius(process.env.HELIUS_API_KEY);
    this.metaplex = new Metaplex(this.connection);
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
    const mintAddress = new PublicKey(
      enrichedTransaction.tokenTransfers.at(0).mint,
    );
    const nft = await this.metaplex.nfts().findByMint({ mintAddress });
    const payload = {
      address: mintAddress.toBase58(),
      candyMachineAddress: 'FRzbE9ENACT1ag8z4Q1JpQ5chU18GZq26Bxr8Vd71BDb',
      collectionNftAddress: nft.collection.address.toBase58(),
      name: nft.name,
      owner: enrichedTransaction.tokenTransfers.at(0).toUserAccount,
      uri: nft.uri,
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
