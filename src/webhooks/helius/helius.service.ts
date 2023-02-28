import { Injectable } from '@nestjs/common';
import { Cluster, PublicKey } from '@solana/web3.js';
import {
  EnrichedTransaction,
  Helius,
  NFTEvent,
  TransactionType,
} from 'helius-sdk';
import { PrismaService } from 'nestjs-prisma';
import { CreateHeliusCollectionWebhookDto } from './dto/create-helius-collection-webhook.dto';
import { CreateHeliusWebhookDto } from './dto/create-helius-webhook.dto';
import { UpdateHeliusWebhookDto } from './dto/update-helius-webhook.dto';
import {
  Metaplex,
  toMetadata,
  toMetadataAccount,
} from '@metaplex-foundation/js';

@Injectable()
export class HeliusService {
  private readonly helius: Helius;
  private readonly metaplex: Metaplex;

  constructor(private readonly prisma: PrismaService) {
    this.helius = new Helius(
      process.env.HELIUS_API_KEY,
      process.env.SOLANA_CLUSTER as Cluster,
    );
    this.metaplex = new Metaplex(this.helius.connection);
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

  async subscribeTo(address: string) {
    const { webhookID, accountAddresses } = await this.getMyWebhook();
    await this.updateWebhook(webhookID, {
      accountAddresses: [...accountAddresses, address],
    });
  }

  async removeSubscription(address: string) {
    const { webhookID, accountAddresses } = await this.getMyWebhook();
    await this.updateWebhook(webhookID, {
      accountAddresses: [...accountAddresses, address],
    });
  }

  updateWebhook(id: string, payload: UpdateHeliusWebhookDto) {
    return this.helius.editWebhook(id, payload);
  }

  async getMyWebhook() {
    const webhooks = await this.helius.getAllWebhooks();
    return webhooks[0]; // replace in the future
  }

  deleteWebhook(id: string) {
    return this.helius.deleteWebhook(id);
  }

  handleWebhookEvent(enrichedTransactions: EnrichedTransaction[]) {
    return Promise.all(
      enrichedTransactions.map((transaction) => {
        switch (transaction.type) {
          case TransactionType.NFT_MINT:
            return this.mintAction(transaction);
          case TransactionType.ANY:
            return this.updateComicIssueNfts(transaction);
          default:
            return;
        }
      }),
    );
  }

  private updateComicIssueNfts(enrichedTransaction: EnrichedTransaction) {
    console.log('update comic issue nfts', enrichedTransaction);
    // owner has changed, update owner?
  }

  private async mintAction(enrichedTransaction: EnrichedTransaction) {
    const mint = new PublicKey(enrichedTransaction.tokenTransfers.at(0).mint);
    const metadataPda = this.metaplex.nfts().pdas().metadata({ mint });

    const latestBlockhash = await this.metaplex.rpc().getLatestBlockhash();
    await this.metaplex.rpc().confirmTransaction(
      enrichedTransaction.signature,
      {
        ...latestBlockhash,
      },
      'finalized',
    );

    const info = await this.metaplex.rpc().getAccount(metadataPda);
    const metadata = toMetadata(toMetadataAccount(info));

    // Candy Machine Guard program is the 5th instruction
    // Candy Machine address is the 3rd account in the guard instruction
    const candyMachineAddress = enrichedTransaction.instructions[4].accounts[2];

    try {
      const candyMachine = await this.prisma.candyMachine.update({
        where: { address: candyMachineAddress },
        data: {
          itemsRemaining: { decrement: 1 },
          itemsMinted: { increment: 1 },
        },
      });

      if (candyMachine.itemsRemaining === 0)
        this.removeSubscription(candyMachine.address);
    } catch (error) {
      console.error('Unsupported candy machine: ', error);
      return;
    }

    try {
      const comicIssueNft = await this.prisma.nft.create({
        data: {
          owner: enrichedTransaction.tokenTransfers.at(0).toUserAccount,
          address: mint.toBase58(),
          name: metadata.name,
          uri: metadata.uri,
          candyMachineAddress,
          collectionNftAddress: metadata.collection.address.toBase58(),
        },
      });
      this.subscribeTo(comicIssueNft.address);
    } catch (error) {
      console.error(error);
    }

    try {
      const nftTransactionInfo = enrichedTransaction.events.nft as NFTEvent & {
        amount: number;
      };
      await this.prisma.candyMachineReceipt.create({
        data: {
          buyer: nftTransactionInfo.buyer,
          price: nftTransactionInfo.amount,
          timestamp: new Date(nftTransactionInfo.timestamp),
          description: enrichedTransaction.description,
          candyMachineAddress,
          nftAddress: mint.toBase58(),
        },
      });
    } catch (error) {
      console.error(error);
    }
  }
}
