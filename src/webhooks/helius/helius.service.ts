import { Injectable } from '@nestjs/common';
import { Cluster, PublicKey } from '@solana/web3.js';
import {
  CompressedNftEvent,
  EnrichedTransaction,
  Helius,
  TransactionType,
  Webhook,
  WebhookType,
} from 'helius-sdk';
import { PrismaService } from 'nestjs-prisma';
import {
  JsonMetadata,
  Metadata,
  Metaplex,
  Nft,
  isNft,
  toMetadata,
  toMetadataAccount,
} from '@metaplex-foundation/js';
import { WebSocketGateway } from '../../websockets/websocket.gateway';
import { CreateHeliusWebhookDto } from './dto/create-helius-webhook.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { metaplex } from '../../utils/metaplex';
import {
  fetchOffChainMetadata,
  findRarityTrait,
  findSignedTrait,
  findUsedTrait,
} from '../../utils/nft-metadata';
import {
  delegateAuthority,
  verifyMintCreator,
} from '../../candy-machine/instructions';
import * as jwt from 'jsonwebtoken';
import {
  CHANGE_COMIC_STATE_ACCOUNT_LEN,
  D_PUBLISHER_SYMBOL,
  SOL_ADDRESS,
} from '../../constants';
import { mintV2Struct } from '@metaplex-foundation/mpl-candy-guard';
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import { Prisma } from '@prisma/client';
import { PROGRAM_ID as COMIC_VERSE_ID } from 'dreader-comic-verse';
import { HeliusCompressedNftMetadata } from '../../types/compression';
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

  updateWebhook(id: string, payload: any): Promise<Webhook> {
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
          case TransactionType.CHANGE_COMIC_STATE:
            return this.handleChangeComicState(transaction);
          case TransactionType.NFT_MINT_REJECTED:
            return this.handleMintRejectedEvent(transaction);
          case TransactionType.COMPRESSED_NFT_MINT:
            return this.handleCompressedNftMint(transaction);
          default:
            console.log('Unhandled webhook', JSON.stringify(transaction));

            // this is here in case Helius still hasn't parsted our transactions for new contract
            return this.handleChangeComicState(transaction);
        }
      }),
    );
  }

  private async handleCompressedNftMint(transaction: EnrichedTransaction) {
    const data = transaction.events.compressed[0] as CompressedNftEvent & {
      metadata: HeliusCompressedNftMetadata;
    };
    const mint = new PublicKey(data.assetId);

    const metadata = data.metadata;
    const offChainMetadata = await fetchOffChainMetadata(metadata.uri);

    const candyMachineAddress = data.treeId;
    let comicIssueId: number = undefined,
      userId: number = undefined;
    try {
      const comicIssueNft = await this.indexCnft(
        data,
        metadata,
        offChainMetadata,
        candyMachineAddress,
      );

      comicIssueId = comicIssueNft.collectionNft.comicIssueId;
      userId = comicIssueNft.owner?.userId;
      this.subscribeTo(comicIssueNft.address);
    } catch (e) {
      console.error(e);
    }

    try {
      const price = transaction.nativeTransfers.at(-1).amount;
      const buyer = data.newLeafOwner;
      const splTokenAddress = SOL_ADDRESS;
      const timestamp = new Date(transaction.timestamp * 1000);

      // find the group where transaction timestamp lies in between startDate and endDate
      const group = await this.prisma.candyMachineGroup.findFirst({
        where: {
          candyMachineAddress,
          startDate: { lt: timestamp },
          endDate: { gt: timestamp },
        },
      });

      const receiptData: Prisma.CandyMachineReceiptCreateInput = {
        nft: { connect: { address: mint.toBase58() } },
        candyMachine: { connect: { address: candyMachineAddress } },
        buyer: {
          connectOrCreate: {
            where: { address: buyer },
            create: { address: buyer },
          },
        },
        price: price,
        timestamp,
        description: transaction.description,
        transactionSignature: transaction.signature,
        splTokenAddress,
        label: group.label,
      };

      if (userId) {
        receiptData.user = {
          connect: { id: userId },
        };
      }
      const receipt = await this.prisma.candyMachineReceipt.create({
        include: { nft: true, buyer: { include: { user: true } } },
        data: receiptData,
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

  private async handleChangeComicState(transaction: EnrichedTransaction) {
    try {
      if (
        transaction.instructions.at(-1).programId ==
          COMIC_VERSE_ID.toString() &&
        transaction.instructions.at(-1).accounts.length ===
          CHANGE_COMIC_STATE_ACCOUNT_LEN
      ) {
        // metadata address is found in the last instruction
        const metadataAddress = transaction.instructions.at(-1).accounts[0];
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
                  collectionAddress: metadata.collection.address.toString(),
                  isUsed: findUsedTrait(offChainMetadata),
                  isSigned: findSignedTrait(offChainMetadata),
                  rarity: findRarityTrait(offChainMetadata),
                },
              },
            },
          },
        });
        this.websocketGateway.handleWalletNftUsed(nft);
      }
    } catch (e) {
      console.error('Failed to handle comic state update', e);
    }
  }

  private async handleInstantBuy(transaction: EnrichedTransaction) {
    try {
      const latestBlockhash = await this.metaplex.rpc().getLatestBlockhash();
      const buyerAddress = transaction.events.nft.buyer;
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
          owner: {
            connectOrCreate: {
              where: { address: buyerAddress },
              create: {
                address: buyerAddress,
                createdAt: new Date(transaction.timestamp * 1000),
              },
            },
          },
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
      console.error('Failed to handle instant buy', e);
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
      console.error('Failed to handle cancel listing', e);
    }
  }

  private async handleNftListing(transaction: EnrichedTransaction) {
    try {
      const mint = transaction.events.nft.nfts[0].mint; // only 1 token would be involved for a nft listing
      const price = transaction.events.nft.amount;
      const feePayer = transaction.feePayer;
      const signature = transaction.signature;
      const createdAt = new Date(transaction.timestamp * 1000);
      const nft = await this.prisma.nft.update({
        where: { address: mint },
        include: {
          collectionNft: true,
          listing: { where: { nftAddress: mint, canceledAt: new Date(0) } },
          owner: { include: { user: true } },
        },
        data: {
          listing: {
            upsert: {
              where: {
                nftAddress_canceledAt: {
                  nftAddress: mint,
                  canceledAt: new Date(0),
                },
              },
              update: {
                price,
                feePayer,
                signature,
                createdAt: new Date(),
                source: transaction.source,
              },
              create: {
                price,
                symbol: D_PUBLISHER_SYMBOL,
                feePayer,
                signature,
                createdAt,
                canceledAt: new Date(0),
                source: transaction.source,
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
      console.error('Failed to handle NFT listing', e);
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
        include: { listing: { where: { canceledAt: new Date(0) } } },
        data: {
          owner: {
            connectOrCreate: {
              where: {
                address: ownerAddress,
              },
              create: {
                address: ownerAddress,
                createdAt: new Date(enrichedTransaction.timestamp * 1000),
              },
            },
          },
          ownerChangedAt: new Date(enrichedTransaction.timestamp * 1000),
        },
      });

      if (nft.listing && nft.listing.length > 0) {
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

      this.websocketGateway.handleWalletNftReceived(ownerAddress, nft);
      this.websocketGateway.handleWalletNftSent(previousOwner, nft);
    } catch (e) {
      console.error('Failed to handle NFT transfer', e);
    }
  }

  private async handleMintEvent(enrichedTransaction: EnrichedTransaction) {
    const mint = new PublicKey(enrichedTransaction.tokenTransfers.at(0).mint);
    const metadataPda = this.metaplex.nfts().pdas().metadata({ mint });

    // Put this into a separate function and place it in an exponential backoff
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

    // Candy Machine Guard program is the last instruction
    // Candy Machine address is the 3rd account in the guard instruction
    const candyMachineAddress =
      enrichedTransaction.instructions.at(-1).accounts[2];
    const ownerAddress = enrichedTransaction.tokenTransfers.at(0).toUserAccount;

    let comicIssueId: number = undefined,
      userId: number = undefined;
    try {
      const comicIssueNft = await this.indexNft(
        metadata,
        offChainMetadata,
        ownerAddress,
        candyMachineAddress,
      );

      comicIssueId = comicIssueNft.collectionNft.comicIssueId;
      userId = comicIssueNft.owner?.userId;
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
      const ixData = mintV2Struct.deserialize(
        bs58.decode(enrichedTransaction.instructions.at(-1).data),
      );
      const receiptData: Prisma.CandyMachineReceiptCreateInput = {
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
        label: ixData[0].label,
      };

      if (userId) {
        receiptData.user = {
          connect: { id: userId },
        };
      }
      const receipt = await this.prisma.candyMachineReceipt.create({
        include: { nft: true, buyer: { include: { user: true } } },
        data: receiptData,
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

  async reindexNft(
    metadataOrNft: Metadata<JsonMetadata<string>> | Nft,
    collectionMetadata: JsonMetadata,
    walletAddress: string,
    candMachineAddress: string,
  ) {
    const mintAddress = isNft(metadataOrNft)
      ? metadataOrNft.address
      : metadataOrNft.mintAddress;
    try {
      if (
        metadataOrNft.updateAuthorityAddress.equals(
          this.metaplex.identity().publicKey,
        )
      ) {
        await delegateAuthority(
          this.metaplex,
          new PublicKey(candMachineAddress),
          metadataOrNft.collection.address,
          findRarityTrait(collectionMetadata).toString(),
          mintAddress,
        );
      }
    } catch (e) {
      console.error(e);
    }

    try {
      if (!metadataOrNft.creators[1].verified) {
        await verifyMintCreator(this.metaplex, mintAddress);
      }
    } catch (e) {
      console.error(e);
    }

    const nft = await this.prisma.nft.update({
      where: { address: mintAddress.toString() },
      include: { owner: { select: { userId: true } } },
      data: {
        // TODO v2: this should fetch the info on when the owner changed from chain
        ownerChangedAt: new Date(0),
        owner: {
          connectOrCreate: {
            where: { address: walletAddress },
            create: { address: walletAddress },
          },
        },
        metadata: {
          connectOrCreate: {
            where: { uri: metadataOrNft.uri },
            create: {
              collectionName: collectionMetadata.collection.name,
              uri: metadataOrNft.uri,
              collectionAddress: metadataOrNft.collection.address.toString(),
              isUsed: findUsedTrait(collectionMetadata),
              isSigned: findSignedTrait(collectionMetadata),
              rarity: findRarityTrait(collectionMetadata),
            },
          },
        },
      },
    });
    this.subscribeTo(mintAddress.toString());
    return nft;
  }

  async indexCnft(
    data: CompressedNftEvent,
    metadata: HeliusCompressedNftMetadata,
    collectionMetadata: JsonMetadata,
    candMachineAddress: string,
  ) {
    const nft = await this.prisma.nft.create({
      include: {
        collectionNft: { select: { comicIssueId: true } },
        owner: { select: { userId: true } },
      },
      data: {
        address: data.assetId,
        name: metadata.name,
        ownerChangedAt: new Date(),
        metadata: {
          connectOrCreate: {
            where: { uri: metadata.uri },
            create: {
              collectionName: collectionMetadata.collection.name,
              collectionAddress: metadata.collection.key,
              uri: metadata.uri,
              isUsed: findUsedTrait(collectionMetadata),
              isSigned: findSignedTrait(collectionMetadata),
              rarity: findRarityTrait(collectionMetadata),
            },
          },
        },
        owner: {
          connectOrCreate: {
            where: { address: data.newLeafOwner },
            create: { address: data.newLeafOwner },
          },
        },
        candyMachine: { connect: { address: candMachineAddress } },
        collectionNft: {
          connect: { address: metadata.collection.key },
        },
      },
    });
    this.subscribeTo(data.assetId);
    return nft;
  }

  async indexNft(
    metadataOrNft: Metadata<JsonMetadata<string>> | Nft,
    collectionMetadata: JsonMetadata,
    walletAddress: string,
    candMachineAddress: string,
  ) {
    const mintAddress = isNft(metadataOrNft)
      ? metadataOrNft.address
      : metadataOrNft.mintAddress;
    try {
      if (
        metadataOrNft.updateAuthorityAddress.equals(
          this.metaplex.identity().publicKey,
        )
      ) {
        await delegateAuthority(
          this.metaplex,
          new PublicKey(candMachineAddress),
          metadataOrNft.collection.address,
          findRarityTrait(collectionMetadata).toString(),
          mintAddress,
        );
      }
    } catch (e) {
      console.error(e);
    }

    try {
      if (!metadataOrNft.creators[1].verified) {
        await verifyMintCreator(this.metaplex, mintAddress);
      }
    } catch (e) {
      console.error(e);
    }

    const nft = await this.prisma.nft.create({
      include: {
        collectionNft: { select: { comicIssueId: true } },
        owner: { select: { userId: true } },
      },
      data: {
        address: mintAddress.toString(),
        name: metadataOrNft.name,
        ownerChangedAt: new Date(),
        metadata: {
          connectOrCreate: {
            where: { uri: metadataOrNft.uri },
            create: {
              collectionName: collectionMetadata.collection.name,
              collectionAddress: metadataOrNft.collection.address.toString(),
              uri: metadataOrNft.uri,
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
          connect: { address: metadataOrNft.collection.address.toString() },
        },
      },
    });
    this.subscribeTo(mintAddress.toString());
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
