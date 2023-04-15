import { BadRequestException, Injectable } from '@nestjs/common';
import { Cluster, PublicKey } from '@solana/web3.js';
import {
  EnrichedTransaction,
  Helius,
  TransactionType,
  WebhookType,
} from 'helius-sdk';
import { PrismaService } from 'nestjs-prisma';
import {
  JsonMetadata,
  Metaplex,
  toMetadata,
  toMetadataAccount,
} from '@metaplex-foundation/js';
import { WebSocketGateway } from '../../websockets/websocket.gateway';
import { CreateHeliusWebhookDto } from './dto/create-helius-webhook.dto';
import { UpdateHeliusWebhookDto } from './dto/update-helius-webhook.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SIGNED_TRAIT, USED_TRAIT } from '../../constants';
import * as jwt from 'jsonwebtoken';
import { isNil } from 'lodash';
import axios from 'axios';

@Injectable()
export class HeliusService {
  readonly helius: Helius;
  private readonly metaplex: Metaplex;
  private readonly webhookID: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly websocketGateway: WebSocketGateway,
  ) {
    this.helius = new Helius(
      process.env.HELIUS_API_KEY,
      process.env.SOLANA_CLUSTER as Cluster,
    );
    this.metaplex = new Metaplex(this.helius.connection);
    this.webhookID = process.env.WEBHOOK_ID;

    if (!this.webhookID) {
      throw new Error('WEBHOOK_ID not provided');
    }
  }

  createWebhook(payload: CreateHeliusWebhookDto) {
    return this.helius.createWebhook({
      ...payload,
      // TODO: scope down to relevant TransactionType-s
      transactionTypes: [TransactionType.ANY],
      webhookType:
        process.env.SOLANA_CLUSTER === 'devnet'
          ? WebhookType.ENHANCED_DEVNET
          : WebhookType.ENHANCED,
      authHeader: this.generateJwtHeader(),
    });
  }

  findAll() {
    return this.helius.getAllWebhooks();
  }

  findOne() {
    return this.helius.getWebhookByID(this.webhookID);
  }

  async subscribeTo(address: string) {
    const { webhookID, accountAddresses } = await this.findOne();
    await this.updateWebhook(webhookID, {
      accountAddresses: accountAddresses.concat(address),
    });
  }

  async removeSubscription(address: string) {
    const { webhookID, accountAddresses } = await this.findOne();
    await this.updateWebhook(webhookID, {
      accountAddresses: accountAddresses.filter((aa) => aa !== address),
    });
  }

  updateWebhook(id: string, payload: UpdateHeliusWebhookDto) {
    return this.helius.editWebhook(id, {
      ...payload,
      authHeader: this.generateJwtHeader(),
    });
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
          case TransactionType.NFT_CANCEL_LISTING:
            return this.handleCancelListing(transaction);
          case TransactionType.NFT_SALE:
            return this.handleInstantBuy(transaction);
          default:
            console.log('Unhandled webhook event type: ', transaction.type);
            return;
        }
      }),
    );
  }

  private async handleInstantBuy(transaction: EnrichedTransaction) {
    try {
      const latestBlockhash = await this.metaplex.rpc().getLatestBlockhash();
      const { value } = await this.metaplex
        .rpc()
        .confirmTransaction(
          transaction.signature,
          { ...latestBlockhash },
          'finalized',
        );
      if (!!value.err) {
        throw new Error('Sale transaction failed to finalize');
      }
      const nftAddress = transaction.events.nft.nfts[0].mint;
      await this.prisma.nft.update({
        where: { address: nftAddress },
        data: {
          ownerAddress: transaction.tokenTransfers[0].toUserAccount,
          listing: {
            update: {
              where: {
                nftAddress_canceledAt: { nftAddress, canceledAt: new Date(0) },
              },
              data: {
                canceledAt: new Date(transaction.timestamp * 1000),
                soldAt: new Date(transaction.timestamp * 1000),
              },
            },
          },
        },
      });
    } catch (error) {
      console.log(error);
    }
  }

  private async handleCancelListing(transaction: EnrichedTransaction) {
    try {
      const mint = transaction.events.nft.nfts[0].mint; // only 1 token would be involved
      await this.prisma.listing.update({
        where: {
          nftAddress_canceledAt: { nftAddress: mint, canceledAt: new Date(0) },
        },
        data: {
          canceledAt: new Date(transaction.timestamp * 1000),
        },
      });
    } catch (error) {
      console.log(error);
    }
  }

  private async handleNftListing(transaction: EnrichedTransaction) {
    try {
      const mint = transaction.events.nft.nfts[0].mint; // only 1 token would be involved for a nft listing
      const price = transaction.events.nft.amount;
      const tokenMetadata = transaction.instructions[0].accounts[2]; //index 2 for tokenMetadata account
      const feePayer = transaction.feePayer;
      const signature = transaction.signature;
      const createdAt = new Date(transaction.timestamp * 1000);
      const info = await this.metaplex
        .rpc()
        .getAccount(new PublicKey(tokenMetadata));
      const metadata = toMetadata(toMetadataAccount(info));
      const { data: collectionMetadata } = await axios.get<JsonMetadata>(
        metadata.uri,
      );

      const usedTrait = collectionMetadata.attributes.find(
        (a) => a.trait_type === USED_TRAIT,
      );
      const signedTrait = collectionMetadata.attributes.find(
        (a) => a.trait_type === SIGNED_TRAIT,
      );

      if (isNil(usedTrait) || isNil(signedTrait)) {
        throw new BadRequestException(
          "Unsupported NFT type, no 'used' or 'signed' traits specified",
        );
      }

      await this.prisma.nft.update({
        where: {
          address: mint,
        },
        data: {
          listing: {
            create: {
              price,
              symbol: metadata.symbol,
              feePayer,
              signature,
              createdAt,
              canceledAt: new Date(0),
            },
          },
          metadata: {
            connectOrCreate: {
              where: { uri: metadata.uri },
              create: {
                collectionName: collectionMetadata.collection.name,
                uri: metadata.uri,
                isUsed: usedTrait.value === 'true',
                isSigned: signedTrait.value === 'true',
              },
            },
          },
        },
      });
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
      } else {
        await this.prisma.listing.update({
          where: {
            nftAddress_canceledAt: {
              nftAddress: address,
              canceledAt: new Date(0),
            },
          },
          data: {
            canceledAt: new Date(enrichedTransaction.timestamp * 1000),
          },
        });
      }
    } catch (e) {
      console.log(e);
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
    const { data: json } = await axios.get<JsonMetadata>(metadata.uri);

    // Candy Machine Guard program is the 5th instruction
    // Candy Machine address is the 3rd account in the guard instruction
    const candyMachineAddress = enrichedTransaction.instructions[4].accounts[2];

    const ownerAddress = enrichedTransaction.tokenTransfers.at(0).toUserAccount;
    const usedTrait = json.attributes.find((a) => a.trait_type === USED_TRAIT);
    const signedTrait = json.attributes.find(
      (a) => a.trait_type === SIGNED_TRAIT,
    );

    if (isNil(usedTrait) || isNil(signedTrait)) {
      throw new BadRequestException(
        "Unsupported NFT type, no 'used' or 'signed' traits specified",
      );
    }

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
          candyMachine: { connect: { address: candyMachineAddress } },
          collectionNft: {
            connect: { address: metadata.collection.address.toBase58() },
          },
          metadata: {
            connectOrCreate: {
              where: { uri: metadata.uri },
              create: {
                collectionName: json.collection.name,
                uri: metadata.uri,
                isUsed: usedTrait.value === 'true',
                isSigned: signedTrait.value === 'true',
              },
            },
          },
        },
      });
      this.subscribeTo(comicIssueNft.address);
    } catch (e) {
      console.error(e);
    }

    try {
      const nftTransactionInfo = enrichedTransaction.events.nft;

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

      this.websocketGateway.handleMintReceipt(receipt);
    } catch (e) {
      console.error(e);
    }
  }

  private generateJwtHeader() {
    const token = jwt.sign({ webhook: true }, process.env.JWT_ACCESS_SECRET, {
      expiresIn: '7d',
    });

    return `Bearer ${token}`;
  }

  // Refresh auth token each day
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async refreshWebhookToken() {
    if (!this.webhookID) return;

    await this.helius.editWebhook(this.webhookID, {
      authHeader: this.generateJwtHeader(),
    });
    console.log('Webhook auth token refreshed');
  }
}
