import { Injectable } from '@nestjs/common';
import {
  Cluster,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  EnrichedTransaction,
  Helius,
  TransactionType,
  WebhookType,
} from 'helius-sdk';
import { PrismaService } from 'nestjs-prisma';
import {
  JsonMetadata,
  Metadata,
  Metaplex,
  toMetadata,
  toMetadataAccount,
} from '@metaplex-foundation/js';
import { WebSocketGateway } from '../../websockets/websocket.gateway';
import { CreateHeliusWebhookDto } from './dto/create-helius-webhook.dto';
import { UpdateHeliusWebhookDto } from './dto/update-helius-webhook.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { metaplex } from '../../utils/metaplex';
import {
  fetchOffChainMetadata,
  findRarityTrait,
  findSignedTrait,
  findUsedTrait,
} from '../../utils/nft-metadata';
import { constructDelegateAuthorityInstruction } from '../../candy-machine/instructions';
import { ComicRarity } from 'dreader-comic-verse';
import * as jwt from 'jsonwebtoken';
import { SOL_ADDRESS } from '../../constants';

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
    this.metaplex = metaplex;
    this.webhookID = process.env.WEBHOOK_ID;
  }

  createWebhook(payload: CreateHeliusWebhookDto) {
    return this.helius.createWebhook({
      ...payload,
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
          // helius-sdk still hasn't updated their TransactionType enum with our transaction type
          case 'CHANGE_COMIC_STATE' as TransactionType:
            return this.handleChangeComicState(transaction);
          case TransactionType.NFT_MINT_REJECTED:
            return this.handleMintRejectedEvent(transaction);
          default:
            console.log('Unhandled webhook', JSON.stringify(transaction));

            // this is here in case Helius still hasn't parsted our transactions
            return this.handleChangeComicState(transaction);
        }
      }),
    );
  }

  private async handleChangeComicState(transaction: EnrichedTransaction) {
    try {
      // metadata address is found in the last instruction
      const metadataAddress =
        transaction.instructions.at(-1).innerInstructions[0].accounts[0];
      const info = await this.metaplex
        .rpc()
        .getAccount(new PublicKey(metadataAddress));

      const metadata = toMetadata(toMetadataAccount(info));
      const collection = metadata.collection;
      const isVerified = await this.verifyMetadataAccount(collection);
      if (!isVerified) {
        throw new Error(`Unverified metadata account ${metadataAddress}`);
      }

      const mint = metadata.mintAddress.toString();
      const offChainMetadata = await fetchOffChainMetadata(metadata.uri);

      const nft = await this.prisma.nft.update({
        where: { address: mint },
        data: {
          metadata: {
            connectOrCreate: {
              where: { uri: metadata.uri },
              create: {
                collectionName: offChainMetadata.collection.name,
                uri: metadata.uri,
                isUsed: findUsedTrait(offChainMetadata),
                isSigned: findSignedTrait(offChainMetadata),
                rarity: findRarityTrait(offChainMetadata),
              },
            },
          },
        },
      });
      this.websocketGateway.handleWalletNftUsed(nft);
    } catch (e) {}
  }

  private async handleInstantBuy(transaction: EnrichedTransaction) {
    try {
      const latestBlockhash = await this.metaplex.rpc().getLatestBlockhash();
      const { value } = await this.metaplex
        .rpc()
        .confirmTransaction(
          transaction.signature,
          { ...latestBlockhash },
          'confirmed',
        );
      if (!!value.err) {
        throw new Error('Sale transaction failed to finalize');
      }
      const nftAddress = transaction.events.nft.nfts[0].mint;
      const nft = await this.prisma.nft.update({
        where: { address: nftAddress },
        include: {
          collectionNft: true,
          listing: {
            where: {
              nftAddress,
              canceledAt: new Date(transaction.timestamp * 1000),
            },
          },
          owner: { include: { user: true } },
        },
        data: {
          ownerAddress: transaction.tokenTransfers[0].toUserAccount,
          ownerChangedAt: new Date(transaction.timestamp * 1000),
          listing: {
            update: {
              where: {
                nftAddress_canceledAt: { nftAddress, canceledAt: new Date(0) },
              },
              data: {
                canceledAt: new Date(transaction.timestamp * 1000),
                soldAt: new Date(transaction.timestamp * 1000),
                saleTransactionSignature: transaction.signature,
              },
            },
          },
        },
      });
      this.websocketGateway.handleNftSold(nft.collectionNft.comicIssueId, {
        ...nft.listing[0],
        nft,
      });
      this.websocketGateway.handleWalletNftSold(transaction.events.nft.seller, {
        ...nft.listing[0],
        nft,
      });
      this.websocketGateway.handleWalletNftBought(nft.ownerAddress, nft);
    } catch (e) {
      console.log('Failed to handle instant buy', e);
    }
  }

  private async handleCancelListing(transaction: EnrichedTransaction) {
    try {
      const mint = transaction.events.nft.nfts[0].mint; // only 1 token would be involved
      const listing = await this.prisma.listing.update({
        where: {
          nftAddress_canceledAt: { nftAddress: mint, canceledAt: new Date(0) },
        },
        include: {
          nft: {
            include: {
              collectionNft: true,
              owner: { include: { user: true } },
            },
          },
        },
        data: {
          canceledAt: new Date(transaction.timestamp * 1000),
        },
      });
      this.websocketGateway.handleNftDelisted(
        listing.nft.collectionNft.comicIssueId,
        listing,
      );
      this,
        this.websocketGateway.handleWalletNftDelisted(
          listing.nft.ownerAddress,
          listing.nft,
        );
    } catch (e) {
      console.log('Failed to handle cancel listing', e);
    }
  }

  private async handleNftListing(transaction: EnrichedTransaction) {
    try {
      const mint = transaction.events.nft.nfts[0].mint; // only 1 token would be involved for a nft listing
      const price = transaction.events.nft.amount;
      const tokenMetadata = transaction.instructions.at(-1).accounts[2]; // token metadata is found in the last instruction
      const feePayer = transaction.feePayer;
      const signature = transaction.signature;
      const createdAt = new Date(transaction.timestamp * 1000);
      const info = await this.metaplex
        .rpc()
        .getAccount(new PublicKey(tokenMetadata));
      const metadata = toMetadata(toMetadataAccount(info));
      const collectionMetadata = await fetchOffChainMetadata(metadata.uri);

      const nft = await this.prisma.nft.update({
        where: { address: mint },
        include: {
          collectionNft: true,
          listing: { where: { nftAddress: mint, canceledAt: new Date(0) } },
          owner: { include: { user: true } },
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
                isUsed: findUsedTrait(collectionMetadata),
                isSigned: findSignedTrait(collectionMetadata),
                rarity: findRarityTrait(collectionMetadata),
              },
            },
          },
        },
      });

      this.websocketGateway.handleNftListed(nft.collectionNft.comicIssueId, {
        ...nft.listing[0],
        nft,
      });
      this.websocketGateway.handleWalletNftListed(nft.ownerAddress, nft);
    } catch (e) {
      console.log('Failed to handle NFT listing', e);
    }
  }

  private async handleNftTransfer(enrichedTransaction: EnrichedTransaction) {
    try {
      const tokenTransfers = enrichedTransaction.tokenTransfers[0];
      const address = tokenTransfers.mint;
      const previousOwner = tokenTransfers.fromUserAccount;
      const ownerAddress = tokenTransfers.toUserAccount;

      const latestBlockhash = await this.metaplex.rpc().getLatestBlockhash();

      await this.metaplex
        .rpc()
        .confirmTransaction(
          enrichedTransaction.signature,
          { ...latestBlockhash },
          'confirmed',
        );

      const nft = await this.prisma.nft.update({
        where: { address },
        data: {
          ownerAddress,
          ownerChangedAt: new Date(enrichedTransaction.timestamp * 1000),
        },
      });

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

      this.websocketGateway.handleWalletNftReceived(ownerAddress, nft);
      this.websocketGateway.handleWalletNftSent(previousOwner, nft);
    } catch (e) {
      console.log('Failed to handle NFT transfer', e);
    }
  }

  private async handleMintEvent(enrichedTransaction: EnrichedTransaction) {
    console.log(enrichedTransaction);
    const mint = new PublicKey(enrichedTransaction.tokenTransfers.at(0).mint);
    const metadataPda = this.metaplex.nfts().pdas().metadata({ mint });
    const latestBlockhash = await this.metaplex.rpc().getLatestBlockhash();
    await this.metaplex
      .rpc()
      .confirmTransaction(
        enrichedTransaction.signature,
        { ...latestBlockhash },
        'confirmed',
      );
    const info = await this.metaplex.rpc().getAccount(metadataPda);
    const metadata = toMetadata(toMetadataAccount(info));
    const offChainMetadata = await fetchOffChainMetadata(metadata.uri);

    // Candy Machine Guard program is the 5th instruction
    // Candy Machine address is the 3rd account in the guard instruction
    const candyMachineAddress = enrichedTransaction.instructions[3].accounts[2];
    const ownerAddress = enrichedTransaction.tokenTransfers.at(0).toUserAccount;

    let comicIssueId: number = undefined;
    try {
      const comicIssueNft = await this.indexNft(
        metadata,
        offChainMetadata,
        ownerAddress,
        candyMachineAddress,
      );

      comicIssueId = comicIssueNft.collectionNft.comicIssueId;
      this.subscribeTo(comicIssueNft.address);
    } catch (e) {
      console.error(e);
    }

    try {
      const nftTransactionInfo = enrichedTransaction.events.nft;
      let splTokenAddress = SOL_ADDRESS;
      if (enrichedTransaction.tokenTransfers.at(1)) {
        splTokenAddress = enrichedTransaction.tokenTransfers.at(1).mint;
      }

      const receipt = await this.prisma.candyMachineReceipt.create({
        include: { nft: true, buyer: { include: { user: true } } },
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
          transactionSignature: nftTransactionInfo.signature,
          splTokenAddress,
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

      this.websocketGateway.handleNftMinted(comicIssueId, receipt);
      this.websocketGateway.handleWalletNftMinted(receipt);
    } catch (e) {
      console.error(e);
    }
  }

  private async handleMintRejectedEvent(
    enrichedTransaction: EnrichedTransaction,
  ) {
    try {
      const nftTransactionInfo = enrichedTransaction.events.nft;
      const collectionNftAddress =
        enrichedTransaction.instructions[3].accounts[13];
      const collectionNft = await this.prisma.collectionNft.findFirst({
        where: { address: collectionNftAddress },
      });
      this.websocketGateway.handleNftMintRejected(collectionNft.comicIssueId);
      this.websocketGateway.handleWalletNftMintRejected(
        nftTransactionInfo.buyer,
      );
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

  async verifyMetadataAccount(collection: {
    address: PublicKey;
    verified: boolean;
  }) {
    return (
      collection.verified &&
      !!(await this.prisma.collectionNft.findFirst({
        where: { address: collection.address.toString() },
      }))
    );
  }

  async verifyMintCreator(mint: PublicKey) {
    await this.metaplex.nfts().verifyCreator({
      mintAddress: mint,
      creator: this.metaplex.identity(),
    });
  }

  async delegateAuthority(
    collectionMint: PublicKey,
    rarity: string,
    mint: PublicKey,
  ) {
    const instruction = await constructDelegateAuthorityInstruction(
      this.metaplex,
      collectionMint,
      ComicRarity[rarity],
      mint,
    );
    const tx = new Transaction().add(instruction);
    await sendAndConfirmTransaction(this.metaplex.connection, tx, [
      this.metaplex.identity(),
    ]);
  }

  async indexNft(
    metadata: Metadata<JsonMetadata<string>>,
    collectionMetadata: JsonMetadata,
    walletAddress: string,
    candMachineAddress: string,
  ) {
    try {
      await Promise.all([
        this.delegateAuthority(
          metadata.collection.address,
          findRarityTrait(collectionMetadata).toString(),
          metadata.mintAddress,
        ),
        this.verifyMintCreator(metadata.mintAddress),
      ]);
    } catch (e) {
      console.error(e);
    }

    const nft = await this.prisma.nft.create({
      select: {
        address: true,
        collectionNft: { select: { comicIssueId: true } },
      },
      data: {
        address: metadata.mintAddress.toString(),
        name: metadata.name,
        ownerChangedAt: new Date(),
        metadata: {
          connectOrCreate: {
            where: { uri: metadata.uri },
            create: {
              collectionName: collectionMetadata.collection.name,
              uri: metadata.uri,
              isUsed: findUsedTrait(collectionMetadata),
              isSigned: findSignedTrait(collectionMetadata),
              rarity: findRarityTrait(collectionMetadata),
            },
          },
        },
        owner: {
          connectOrCreate: {
            where: { address: walletAddress },
            create: { address: walletAddress },
          },
        },
        candyMachine: { connect: { address: candMachineAddress } },
        collectionNft: {
          connect: { address: metadata.collection.address.toString() },
        },
      },
    });

    this.subscribeTo(metadata.mintAddress.toString());
    return nft;
  }

  // Refresh auth token each day
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async refreshWebhookToken() {
    if (!this.webhookID) return;

    await this.helius.editWebhook(this.webhookID, {
      authHeader: this.generateJwtHeader(),
    });

    console.info('Webhook auth token refreshed');
  }
}
