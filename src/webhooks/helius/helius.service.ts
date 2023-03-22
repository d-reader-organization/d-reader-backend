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
import { WebSocketGateway } from 'src/websockets/websocket.gateway';

@Injectable()
export class HeliusService {
  private readonly helius: Helius;
  private readonly metaplex: Metaplex;

  constructor(
    private readonly prisma: PrismaService,
    private readonly websocketGateway: WebSocketGateway,
  ) {
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

  async findAll() {
    return await this.helius.getAllWebhooks();
  }

  async findOne(id: string) {
    const webhook = await this.helius.getWebhookByID(id);
    return webhook;
  }

  async findFirst() {
    const webhooks = await this.findAll();
    return webhooks[0];
  }

  async subscribeTo(address: string) {
    const { webhookID, accountAddresses } = await this.findFirst();
    await this.updateWebhook(webhookID, {
      accountAddresses: [...accountAddresses, address],
    });
  }

  async removeSubscription(address: string) {
    const { webhookID, accountAddresses } = await this.findFirst();
    await this.updateWebhook(webhookID, {
      accountAddresses: [...accountAddresses, address],
    });
  }

  updateWebhook(id: string, payload: UpdateHeliusWebhookDto) {
    return this.helius.editWebhook(id, payload);
  }

  deleteWebhook(id: string) {
    return this.helius.deleteWebhook(id);
  }

  handleWebhookEvent(enrichedTransactions: EnrichedTransaction[]) {
    return Promise.all(
      enrichedTransactions.map((transaction) => {
        switch (transaction.type) {
          case TransactionType.NFT_MINT:
            return this.handleMintEvent(transaction);
          case TransactionType.TRANSFER:
            return this.handleNftTransfer(transaction);
          case TransactionType.NFT_LISTING:
            return this.handleNftListing(transaction);
          default:
            return;
        }
      }),
    );
  }

  private async handleNftListing(transaction: EnrichedTransaction) {
    try {
      // change after helius fix
      const mint = transaction.events.nft.tokensInvolved[0].mint; // only 1 token would be involved for a nft listing
      const sellerAddress = transaction.events.nft.seller;
      // change after helius fix
      const price = transaction.events.nft.transactionAmount;
      const tokenMetadata = transaction.instructions[0].accounts[2]; //index 2 for tokenMetadata account
      const feePayer = transaction.feePayer;
      const signature = transaction.signature;
      const createdAt = new Date(transaction.timestamp * 1000);
      const info = await this.metaplex
        .rpc()
        .getAccount(new PublicKey(tokenMetadata));
      const metadata = toMetadata(toMetadataAccount(info));

      const listing = await this.prisma.listing.create({
        data: {
          nftAddress: mint,
          name: metadata.name,
          uri: metadata.uri,
          sellerAddress,
          price,
          symbol: metadata.symbol,
          feePayer,
          signature,
          createdAt,
        },
      });

      return listing;
    } catch (error) {
      console.log(error);
    }
  }

  private async handleNftTransfer(enrichedTransaction: EnrichedTransaction) {
    try {
      const tokenTransfers = enrichedTransaction.tokenTransfers[0];
      const address = tokenTransfers.mint;
      const previousOwner = tokenTransfers.fromUserAccount;
      const ownerAddress = tokenTransfers.toUserAccount;

      const latestBlockhash = await this.metaplex.rpc().getLatestBlockhash();

      await this.prisma.nft.update({
        where: { address },
        data: { ownerAddress },
      });

      const { value } = await this.metaplex
        .rpc()
        .confirmTransaction(
          enrichedTransaction.signature,
          { ...latestBlockhash },
          'finalized',
        );

      if (!!value.err) {
        await this.prisma.nft.update({
          where: { address },
          data: { ownerAddress: previousOwner },
        });
      }
    } catch (error) {
      console.log(error);
    }
  }

  private async handleMintEvent(enrichedTransaction: EnrichedTransaction) {
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

      if (candyMachine.itemsRemaining === 0) {
        this.removeSubscription(candyMachine.address);
      }
    } catch (error) {
      console.error('Unsupported candy machine: ', error);
      return;
    }

    const ownerAddress = enrichedTransaction.tokenTransfers.at(0).toUserAccount;
    try {
      const comicIssueNft = await this.prisma.nft.create({
        data: {
          owner: {
            connectOrCreate: {
              where: { address: ownerAddress },
              create: { address: ownerAddress },
            },
          },
          address: mint.toBase58(),
          name: metadata.name,
          uri: metadata.uri,
          candyMachine: { connect: { address: candyMachineAddress } },
          collectionNft: {
            connect: { address: metadata.collection.address.toBase58() },
          },
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

      const receipt = await this.prisma.candyMachineReceipt.create({
        include: { nft: true, buyer: true },
        data: {
          nft: { connect: { address: mint.toBase58() } },
          candyMachine: { connect: { address: candyMachineAddress } },
          buyer: {
            connectOrCreate: {
              where: { address: nftTransactionInfo.buyer },
              create: { address: nftTransactionInfo.buyer },
            },
          },
          price: nftTransactionInfo.amount,
          timestamp: new Date(nftTransactionInfo.timestamp * 1000),
          description: enrichedTransaction.description,
        },
      });

      console.log('receiptCreated');
      this.websocketGateway.handleMintReceipt(receipt);
    } catch (error) {
      console.error(error);
    }
  }
}
