import { Injectable } from '@nestjs/common';
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
  Metadata,
  Metaplex,
  Nft,
  isNft,
  toMetadata,
  toMetadataAccount,
} from '@metaplex-foundation/js';
import { WebSocketGateway } from '../../websockets/websocket.gateway';
import { CreateHeliusWebhookDto } from './dto/create-helius-webhook.dto';
import { UpdateHeliusWebhookDto } from './dto/update-helius-webhook.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { metaplex, umi } from '../../utils/metaplex';
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
  CMA_PROGRAM_ID,
  D_PUBLISHER_SYMBOL,
  MINT_CORE_V1_DISCRIMINATOR,
  SOL_ADDRESS,
  TRANSFER_CORE_V1_DISCRIMINANT,
  UPDATE_CORE_V1_DISCRIMINANT,
} from '../../constants';
import { mintV2Struct } from '@metaplex-foundation/mpl-candy-guard';
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import { Prisma } from '@prisma/client';
import { PROGRAM_ID as COMIC_VERSE_ID } from 'dreader-comic-verse';
import {
  AssetV1,
  fetchAssetV1,
  MPL_CORE_PROGRAM_ID,
  getUpdateV1InstructionDataSerializer,
} from '@metaplex-foundation/mpl-core';
import { Umi, publicKey } from '@metaplex-foundation/umi';
import { array, base58, u8 } from '@metaplex-foundation/umi/serializers';
import { fetchCandyMachine } from '@metaplex-foundation/mpl-core-candy-machine';
import { NonceService } from '../../nonce/nonce.service';
import { getMintV1InstructionDataSerializer } from '@metaplex-foundation/mpl-core-candy-machine/dist/src/generated/instructions/mintV1';
import { isEqual } from 'lodash';

@Injectable()
export class HeliusService {
  readonly helius: Helius;
  private readonly metaplex: Metaplex;
  private readonly umi: Umi;
  private readonly webhookID: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly websocketGateway: WebSocketGateway,
    private readonly nonceService: NonceService,
  ) {
    this.helius = new Helius(
      process.env.HELIUS_API_KEY,
      process.env.SOLANA_CLUSTER as Cluster,
    );
    this.metaplex = metaplex;
    this.umi = umi;
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
          case TransactionType.CHANGE_COMIC_STATE:
            return this.handleChangeComicState(transaction);
          case TransactionType.NFT_MINT_REJECTED:
            return this.handleMintRejectedEvent(transaction);
          default:
            const instruction = transaction.instructions.at(-1);
            const data = bs58.decode(instruction.data);

            if (instruction.programId == CMA_PROGRAM_ID) {
              const discriminator = array(u8(), { size: 8 }).deserialize(
                data.subarray(0, 8),
              );
              if (isEqual(discriminator[0], MINT_CORE_V1_DISCRIMINATOR)) {
                return this.handleCoreMintEvent(transaction);
              }
            } else if (
              instruction.programId == MPL_CORE_PROGRAM_ID.toString()
            ) {
              // Check if it's transfer or update transaction as per discriminant
              const discriminant = u8().deserialize(data.subarray(0, 8));
              if (discriminant[0] == TRANSFER_CORE_V1_DISCRIMINANT) {
                return this.handleCoreNftTransfer(transaction);
              } else if (discriminant[0] == UPDATE_CORE_V1_DISCRIMINANT) {
                return this.handleChangeCoreComicState(transaction);
              }
            }
            console.log('Unhandled webhook', JSON.stringify(transaction));
            // this is here in case Helius still hasn't parsted our transactions for new contract
            return this.handleChangeComicState(transaction);
        }
      }),
    );
  }

  private async handleCoreNftTransfer(
    enrichedTransaction: EnrichedTransaction,
  ) {
    const transferInstruction = enrichedTransaction.instructions.at(-1);
    const address = transferInstruction.accounts.at(0);
    try {
      const ownerAddress = transferInstruction.accounts.at(-3);
      const previousOwner = transferInstruction.accounts.at(-4);

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
      console.error(`Failed to index Core nft ${address} While transfer event`);
    }
  }

  private async handleChangeCoreComicState(
    enrichedTransaction: EnrichedTransaction,
  ) {
    try {
      const updateInstruction = enrichedTransaction.instructions.at(-1);
      try {
        // Update nonce account if used in ChangeCoreComicState transaction
        const transactionData = await this.umi.rpc.getTransaction(
          base58.serialize(enrichedTransaction.signature),
        );
        const blockhash = transactionData.message.blockhash;

        const nonce = await this.prisma.durableNonce.findFirst({
          where: { nonce: blockhash },
        });
        if (nonce) {
          await this.nonceService.updateNonce(new PublicKey(nonce.address));
        }
      } catch (e) {
        console.error(`Fails to update nonce for ChangeCoreComicStateTx`);
      }

      const updateSerializer = getUpdateV1InstructionDataSerializer();
      const updateArgs = updateSerializer.deserialize(
        bs58.decode(updateInstruction.data),
      )[0];

      const uri =
        updateArgs.newUri.__option == 'Some' ? updateArgs.newUri.value : null;
      const mint = updateInstruction.innerInstructions.at(0).accounts.at(-1);

      if (uri) {
        const offChainMetadata = await fetchOffChainMetadata(uri);
        const nft = await this.prisma.nft.update({
          where: { address: mint },
          data: {
            metadata: {
              connectOrCreate: {
                where: { uri },
                create: {
                  collectionName: offChainMetadata.collection.name,
                  uri,
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
      console.error(`Error changing core comic state`, e);
    }
  }

  private async handleCoreMintEvent(enrichedTransaction: EnrichedTransaction) {
    const mintInstruction = enrichedTransaction.instructions.at(-1);
    const mintV1Serializer = getMintV1InstructionDataSerializer();

    const candyMachineAddress =
      enrichedTransaction.instructions.at(-1).accounts[2];
    const ownerAddress =
      enrichedTransaction.nativeTransfers.at(0).fromUserAccount;
    const mint = enrichedTransaction.instructions.at(-1).accounts[7];

    const latestBlockhash = await this.metaplex.connection.getLatestBlockhash(
      'confirmed',
    );
    await this.metaplex
      .rpc()
      .confirmTransaction(
        enrichedTransaction.signature,
        { ...latestBlockhash },
        'confirmed',
      );

    const nft = await fetchAssetV1(this.umi, publicKey(mint), {
      commitment: 'confirmed',
    });
    const offChainMetadata = await fetchOffChainMetadata(nft.uri);

    let comicIssueId: number = undefined,
      userId: number = undefined;
    try {
      const comicIssueNft = await this.indexCoreNft(
        nft,
        offChainMetadata,
        ownerAddress,
        candyMachineAddress,
      );

      comicIssueId = comicIssueNft.collectionNft.comicIssueId;
      userId = comicIssueNft.owner?.userId;
      await this.subscribeTo(comicIssueNft.address);
    } catch (e) {
      console.error(e);
    }

    try {
      let splTokenAddress = SOL_ADDRESS;
      if (enrichedTransaction.tokenTransfers.at(1)) {
        splTokenAddress = enrichedTransaction.tokenTransfers.at(1).mint;
      }

      const ownerAccountData = enrichedTransaction.accountData.find(
        (data) => data.account == ownerAddress,
      );
      const price = Math.abs(ownerAccountData.nativeBalanceChange);

      const ixData = mintV1Serializer.deserialize(
        bs58.decode(mintInstruction.data),
      )[0];

      const receiptData: Prisma.CandyMachineReceiptCreateInput = {
        nft: { connect: { address: mint } },
        candyMachine: { connect: { address: candyMachineAddress } },
        buyer: {
          connectOrCreate: {
            where: { address: ownerAddress },
            create: { address: ownerAddress },
          },
        },
        price,
        timestamp: new Date(enrichedTransaction.timestamp * 1000),
        description: enrichedTransaction.description,
        transactionSignature: enrichedTransaction.signature,
        splTokenAddress,
        label: ixData.group.__option == 'Some' ? ixData.group.value : undefined,
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

      const candyMachine = await fetchCandyMachine(
        this.umi,
        publicKey(candyMachineAddress),
      );

      const itemsRemaining =
        Number(candyMachine.data.itemsAvailable) -
        Number(candyMachine.itemsRedeemed);
      await this.prisma.candyMachine.update({
        where: { address: candyMachineAddress },
        data: {
          itemsRemaining,
          itemsMinted: Number(candyMachine.itemsRedeemed),
        },
      });

      if (itemsRemaining === 0) {
        this.removeSubscription(candyMachine.publicKey.toString());
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
      const candyMachine = await this.metaplex
        .candyMachines()
        .findByAddress(
          { address: new PublicKey(candyMachineAddress) },
          { commitment: 'confirmed' },
        );

      const itemsRemaining = candyMachine.itemsRemaining.toNumber();
      await this.prisma.candyMachine.update({
        where: { address: candyMachineAddress },
        data: {
          itemsRemaining,
          itemsMinted: candyMachine.itemsMinted.toNumber(),
        },
      });

      if (itemsRemaining === 0) {
        this.removeSubscription(candyMachine.address.toString());
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

  async indexCoreNft(
    asset: AssetV1,
    offChainMetadata: JsonMetadata,
    walletAddress: string,
    candMachineAddress: string,
  ) {
    const nft = await this.prisma.nft.create({
      include: {
        collectionNft: { select: { comicIssueId: true } },
        owner: { select: { userId: true } },
      },
      data: {
        address: asset.publicKey.toString(),
        name: asset.name,
        ownerChangedAt: new Date(),
        metadata: {
          connectOrCreate: {
            where: { uri: asset.uri },
            create: {
              collectionName: offChainMetadata.name,
              uri: asset.uri,
              isUsed: findUsedTrait(offChainMetadata),
              isSigned: findSignedTrait(offChainMetadata),
              rarity: findRarityTrait(offChainMetadata),
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
          connect: { address: asset.updateAuthority.address.toString() },
        },
      },
    });

    this.subscribeTo(asset.publicKey.toString());
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
