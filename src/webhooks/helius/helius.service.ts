import { Injectable } from '@nestjs/common';
import { Cluster, PublicKey } from '@solana/web3.js';
import {
  DAS,
  EnrichedTransaction,
  Helius,
  InnerInstruction,
  Instruction,
  Interface,
  Scope,
  Source,
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
  BURN_CORE_COLLECTION_V1_DISCRIMINANT,
  BURN_CORE_V1_DISCRIMINANT,
  BUY_EDITION_DISCRIMINATOR,
  CHANGE_COMIC_STATE_ACCOUNT_LEN,
  CMA_PROGRAM_ID,
  D_READER_AUCTION,
  D_READER_AUCTION_BID_DISCRIMINATOR,
  D_READER_AUCTION_CANCEL_BID_DISCRIMINATOR,
  D_READER_AUCTION_CANCEL_LISTING_DISCRIMINATOR,
  D_READER_AUCTION_EXECUTE_SALE_DISCRIMINATOR,
  D_READER_AUCTION_REPRICE_DISCRIMINATOR,
  D_READER_AUCTION_SELL_DISCRIMINATOR,
  D_READER_AUCTION_TIMED_SELL_DISCRIMINATOR,
  INIT_EDITION_SALE_DISCRIMINATOR,
  MINT_CORE_V1_DISCRIMINATOR,
  TCOMP_PROGRAM_ID,
  TRANSFER_CORE_V1_DISCRIMINANT,
  TRANSFER_LEGACY_DISCRIMINANT,
  UPDATE_CORE_V1_DISCRIMINANT,
} from '../../constants';
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import { Prisma, TransactionStatus } from '@prisma/client';
import { PROGRAM_ID as COMIC_VERSE_ID } from 'dreader-comic-verse';
import {
  fetchAssetV1,
  MPL_CORE_PROGRAM_ID,
  getUpdateV1InstructionDataSerializer,
  fetchCollection,
} from '@metaplex-foundation/mpl-core';
import { Umi, publicKey } from '@metaplex-foundation/umi';
import { array, base58, u8 } from '@metaplex-foundation/umi/serializers';
import {
  fetchCandyMachine,
  MPL_CORE_CANDY_GUARD_PROGRAM_ID,
} from '@metaplex-foundation/mpl-core-candy-machine';
import { NonceService } from '../../nonce/nonce.service';
import { isEqual } from 'lodash';
import { getAsset } from '../../utils/das';
import { IndexCoreAssetReturnType } from './dto/types';
import {
  CORE_AUCTIONS_PROGRAM_ID,
  getBuyInstructionDataSerializer,
  getInitEditionSaleInstructionDataSerializer,
  getRepriceInstructionDataSerializer,
  getSellInstructionDataSerializer,
  getTimedAuctionSellInstructionDataSerializer,
} from 'core-auctions';
import { ERROR_MESSAGES } from '../../utils/errors';
import { MPL_TOKEN_METADATA_PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';

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
    try {
      const { webhookID, accountAddresses } = await this.findOne();
      await this.updateWebhook(webhookID, {
        accountAddresses: accountAddresses.concat(address),
      });
    } catch (e) {
      console.error(ERROR_MESSAGES.SUBSCRIBE_FAILED(address));
    }
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
    console.log(enrichedTransactions);
    return Promise.all(
      enrichedTransactions.map((transaction) => {
        switch (transaction.type) {
          case TransactionType.TRANSFER:
            return this.handleLegacyCollectibleComicTransfer(
              transaction.instructions.at(-1),
              transaction.signature,
            );
          case TransactionType.CHANGE_COMIC_STATE:
            return this.handleChangeLegacyCollectibleComicState(transaction);
          default:
            return this.handleUnknownWebhookEvent(transaction);
        }
      }),
    );
  }

  /**
   * Handles unknown webhook events by processing the transaction's last instruction.
   */
  private async handleUnknownWebhookEvent(
    transaction: EnrichedTransaction,
  ): Promise<void> | undefined {
    const lastInstruction = transaction.instructions.at(-1);
    if (!lastInstruction) {
      console.warn('No instructions found in transaction');
      return;
    }

    const handleInstruction = async (
      instruction: Instruction | InnerInstruction,
    ) => {
      if (!instruction.data) return;

      const data = bs58.decode(instruction.data);
      let discriminator = null;

      switch (instruction.programId) {
        case CMA_PROGRAM_ID:
          try {
            discriminator = array(u8(), { size: 8 }).deserialize(
              data.subarray(0, 8),
            );
          } catch (e) {
            console.log(
              `This Instruction in program ${CMA_PROGRAM_ID} is not supported`,
            );
            return;
          }
          if (isEqual(discriminator[0], MINT_CORE_V1_DISCRIMINATOR)) {
            return this.handleCoreCollectibleComicMintEvent(transaction);
          }
          console.log('No handler for this instruction event');
          break;

        case MPL_CORE_PROGRAM_ID.toString(): {
          const discriminant = u8().deserialize(data.subarray(0, 1))[0];
          if (discriminant === TRANSFER_CORE_V1_DISCRIMINANT) {
            await this.handleAssetTransfer(instruction);
          } else if (discriminant === UPDATE_CORE_V1_DISCRIMINANT) {
            await this.handleChangeCoreCollectibleComicState(
              instruction,
              transaction.signature,
            );
          } else if (
            discriminant === BURN_CORE_V1_DISCRIMINANT ||
            discriminant === BURN_CORE_COLLECTION_V1_DISCRIMINANT
          ) {
            await this.handleAssetBurn(instruction);
          }
          break;
        }

        case MPL_TOKEN_METADATA_PROGRAM_ID.toString(): {
          const discriminant = u8().deserialize(data.subarray(0, 1))[0];

          if (discriminant === TRANSFER_LEGACY_DISCRIMINANT) {
            await this.handleLegacyCollectibleComicTransfer(
              instruction,
              transaction.signature,
            );
          }
          break;
        }

        case CORE_AUCTIONS_PROGRAM_ID.toString():
          try {
            discriminator = array(u8(), { size: 8 }).deserialize(
              data.subarray(0, 8),
            );
          } catch (e) {
            console.log(
              `This Instruction in program ${CORE_AUCTIONS_PROGRAM_ID} is not supported`,
            );
            return;
          }

          if (isEqual(discriminator[0], D_READER_AUCTION_SELL_DISCRIMINATOR)) {
            await this.handleAssetListing(instruction, transaction.signature);
          } else if (
            isEqual(discriminator[0], D_READER_AUCTION_BID_DISCRIMINATOR)
          ) {
            await this.handleAssetBid(instruction, transaction.signature);
          } else if (
            isEqual(discriminator[0], D_READER_AUCTION_TIMED_SELL_DISCRIMINATOR)
          ) {
            await this.handleAssetTimedListing(
              instruction,
              transaction.signature,
            );
          } else if (
            isEqual(
              discriminator[0],
              D_READER_AUCTION_EXECUTE_SALE_DISCRIMINATOR,
            )
          ) {
            await this.handleAssetSale(instruction, transaction.signature);
          } else if (
            isEqual(discriminator[0], D_READER_AUCTION_REPRICE_DISCRIMINATOR)
          ) {
            await this.handleListingReprice(instruction);
          } else if (
            isEqual(discriminator[0], D_READER_AUCTION_CANCEL_BID_DISCRIMINATOR)
          ) {
            await this.handleCancelBid(instruction);
          } else if (
            isEqual(
              discriminator[0],
              D_READER_AUCTION_CANCEL_LISTING_DISCRIMINATOR,
            )
          ) {
            await this.handleCancelListing(instruction);
          } else if (
            isEqual(discriminator[0], INIT_EDITION_SALE_DISCRIMINATOR)
          ) {
            await this.handleInitEditionSale(instruction);
          } else if (isEqual(discriminator[0], BUY_EDITION_DISCRIMINATOR)) {
            await this.handleBuyEdition(instruction);
          } else {
            console.log(
              'Unhandled webhook',
              JSON.stringify(transaction, null, 2),
            );
            return;
          }
          break;
        default:
          if ('innerInstructions' in instruction) {
            for (const innerInstruction of instruction.innerInstructions) {
              await handleInstruction(innerInstruction);
            }
          }
          return;
      }
    };

    if (lastInstruction.programId === CMA_PROGRAM_ID) {
      return handleInstruction(lastInstruction);
    }

    for (const instruction of transaction.instructions) {
      await handleInstruction(instruction);
    }
  }

  private async handleAssetBurn(instruction: Instruction | InnerInstruction) {
    const address = instruction.accounts.at(0);

    try {
      await this.prisma.digitalAsset.update({
        where: { address },
        data: { isBurned: true },
      });
      await this.removeSubscription(address);
    } catch (e) {
      console.error(ERROR_MESSAGES.BURN_ERROR(address));
    }
  }

  private async handleInitEditionSale(
    instruction: Instruction | InnerInstruction,
  ) {
    const data = getInitEditionSaleInstructionDataSerializer().deserialize(
      bs58.decode(instruction.data),
    )[0];

    const { price } = data;
    const startDate =
      data.startDate.__option == 'Some'
        ? new Date(Number(data.startDate.value) * 1000)
        : undefined;
    const endDate =
      data.endDate.__option == 'Some'
        ? new Date(Number(data.endDate.value) * 1000)
        : undefined;

    const currencyMint = instruction.accounts.at(3);
    const address = instruction.accounts.at(4);

    const collection = await fetchCollection(this.umi, publicKey(address));
    const supply = collection.masterEdition.maxSupply;

    await this.prisma.printEditionCollection.update({
      where: { address },
      data: {
        printEditionSaleConfig: {
          upsert: {
            update: {
              startDate,
              endDate,
              mintPrice: price,
              supply,
              isActive: true,
            },
            create: {
              startDate,
              endDate,
              mintPrice: price,
              currencyMint,
              supply,
            },
          },
        },
      },
    });
  }

  private async handleBuyEdition(instruction: Instruction | InnerInstruction) {
    const address = instruction.accounts.at(4);
    const ownerAddress = instruction.accounts.at(6);
    const collectionAddress = instruction.accounts.at(5);

    const asset = await fetchAssetV1(this.umi, publicKey(address));

    await this.prisma.printEdition.create({
      data: {
        digitalAsset: {
          create: {
            address,
            owner: {
              connectOrCreate: {
                where: { address: ownerAddress },
                create: { address: ownerAddress },
              },
            },
            ownerChangedAt: new Date(),
          },
        },
        printEditionCollection: { connect: { address: collectionAddress } },
        number: asset.edition.number,
      },
    });
  }

  private async handleAssetSale(
    instruction: Instruction | InnerInstruction,
    transactionSignature: string,
  ) {
    const buyerAddress = instruction.accounts.at(0);
    const assetAddress = instruction.accounts.at(9);
    const auctionHouseAddress = instruction.accounts.at(6);

    const bid = await this.prisma.bid.findUnique({
      where: {
        assetAddress_bidderAddress_closedAt: {
          assetAddress,
          bidderAddress: buyerAddress,
          closedAt: new Date(0),
        },
      },
    });

    const createSale = this.prisma.auctionSale.create({
      data: {
        auctionHouse: {
          connect: { address: auctionHouseAddress },
        },
        soldAt: new Date(),
        signature: transactionSignature,
        price: bid.amount,
        listing: {
          connect: {
            assetAddress_closedAt: { assetAddress, closedAt: new Date(0) },
          },
        },
        bid: {
          connect: {
            assetAddress_bidderAddress_closedAt: {
              assetAddress,
              bidderAddress: buyerAddress,
              closedAt: new Date(0),
            },
          },
        },
      },
    });

    const updateListing = this.prisma.listing.update({
      where: { assetAddress_closedAt: { assetAddress, closedAt: new Date(0) } },
      data: {
        closedAt: new Date(),
        digitalAsset: { update: { ownerAddress: buyerAddress } },
      },
    });

    const updateBid = this.prisma.bid.update({
      where: {
        assetAddress_bidderAddress_closedAt: {
          assetAddress,
          bidderAddress: buyerAddress,
          closedAt: new Date(0),
        },
      },
      data: { closedAt: new Date() },
    });

    await this.prisma.$transaction([createSale, updateListing, updateBid]);
  }

  private async handleCancelBid(instruction: Instruction | InnerInstruction) {
    const bidderAddress = instruction.accounts.at(0);
    const assetAddress = instruction.accounts.at(1);

    await this.prisma.bid.update({
      where: {
        assetAddress_bidderAddress_closedAt: {
          assetAddress,
          bidderAddress,
          closedAt: new Date(0),
        },
      },
      data: { closedAt: new Date() },
    });
  }

  private async handleCancelListing(
    instruction: Instruction | InnerInstruction,
  ) {
    const assetAddress = instruction.accounts.at(1);

    await this.prisma.listing.update({
      where: { assetAddress_closedAt: { assetAddress, closedAt: new Date(0) } },
      data: { closedAt: new Date() },
    });
  }

  private async handleListingReprice(
    instruction: Instruction | InnerInstruction,
  ) {
    const assetAddress = instruction.accounts.at(3);
    const data = bs58.decode(instruction.data);
    const repriceData =
      getRepriceInstructionDataSerializer().deserialize(data)[0];

    await this.prisma.listing.update({
      where: { assetAddress_closedAt: { assetAddress, closedAt: new Date(0) } },
      data: {
        price: repriceData.price,
      },
    });
  }

  private async handleAssetListing(
    instruction: Instruction | InnerInstruction,
    transactionSignature: string,
  ) {
    const data = bs58.decode(instruction.data);
    const sellData = getSellInstructionDataSerializer().deserialize(data)[0];
    const assetAddress = instruction.accounts.at(4);
    const auctionHouseAddress = instruction.accounts.at(2);
    const sellerAddress = instruction.accounts.at(0);

    await this.prisma.listing.create({
      data: {
        digitalAsset: {
          connect: {
            address: assetAddress,
          },
        },
        auctionHouse: {
          connect: {
            address: auctionHouseAddress,
          },
        },
        sellerAddress,
        signature: transactionSignature,
        source: D_READER_AUCTION,
        createdAt: new Date(),
        price: sellData.price,
        closedAt: new Date(0),
      },
    });
  }

  private async handleAssetBid(
    instruction: Instruction | InnerInstruction,
    transactionSignature: string,
  ) {
    const bidderAddress = instruction.accounts.at(0);
    const assetAddress = instruction.accounts.at(2);

    const bidData = getBuyInstructionDataSerializer().deserialize(
      bs58.decode(instruction.data),
    )[0];
    const auctionHouseAddress = instruction.accounts.at(7);
    const bid = await this.prisma.bid.create({
      data: {
        digitalAsset: {
          connect: { address: assetAddress },
        },
        bidderAddress,
        signature: transactionSignature,
        closedAt: new Date(0),
        createdAt: new Date(),
        amount: bidData.bidPrice,
        auctionHouse: {
          connect: { address: auctionHouseAddress },
        },
      },
    });

    const listingData = await this.prisma.listing.findUnique({
      where: { assetAddress_closedAt: { assetAddress, closedAt: new Date(0) } },
      include: { listingConfig: true },
    });

    if (listingData.listingConfig) {
      const highestBid = listingData.listingConfig.highestBidId
        ? await this.prisma.bid.findUnique({
            where: { id: listingData.listingConfig.highestBidId },
          })
        : undefined;

      if (!highestBid || highestBid.amount < bidData.bidPrice) {
        await this.prisma.listingConfig.update({
          where: { listingId: listingData.id },
          data: { highestBidId: bid.id },
        });
      }
    }
  }

  private async handleAssetTimedListing(
    instruction: Instruction | InnerInstruction,
    transactionSignature: string,
  ) {
    const data = bs58.decode(instruction.data);
    const timedAuctionSellData =
      getTimedAuctionSellInstructionDataSerializer().deserialize(data)[0];
    const assetAddress = instruction.accounts.at(4);
    const auctionHouseAddress = instruction.accounts.at(2);
    const sellerAddress = instruction.accounts.at(0);
    const {
      reservePrice,
      startDate,
      endDate,
      allowHighBidCancel,
      minBidIncrement,
    } = timedAuctionSellData;

    await this.prisma.listing.create({
      data: {
        digitalAsset: {
          connect: {
            address: assetAddress,
          },
        },
        auctionHouse: {
          connect: {
            address: auctionHouseAddress,
          },
        },
        sellerAddress,
        signature: transactionSignature,
        source: D_READER_AUCTION,
        createdAt: new Date(),
        price: 0,
        closedAt: new Date(0),
        listingConfig: {
          create: {
            startDate: new Date(Number(startDate) * 1000),
            endDate: new Date(Number(endDate) * 1000),
            allowHighBidCancel:
              allowHighBidCancel.__option === 'Some'
                ? allowHighBidCancel.value
                : false,
            minBidIncrement:
              minBidIncrement.__option === 'Some'
                ? Number(minBidIncrement.value)
                : 0,
            reservePrice:
              reservePrice.__option === 'Some' ? Number(reservePrice.value) : 0,
          },
        },
      },
    });
  }

  /**
   * Handles Core Asset transfer events by updating the asset's owner and related listings.
   */
  private async handleAssetTransfer(
    transferInstruction: Instruction | InnerInstruction,
  ) {
    const address = transferInstruction.accounts.at(0);
    try {
      const ownerAddress = transferInstruction.accounts.at(-3);

      const asset = await this.prisma.digitalAsset.update({
        where: { address },
        include: {
          listings: { where: { closedAt: new Date(0) } },
        },
        data: {
          owner: {
            connectOrCreate: {
              where: {
                address: ownerAddress,
              },
              create: {
                address: ownerAddress,
                createdAt: new Date(),
              },
            },
          },
          ownerChangedAt: new Date(),
        },
      });

      const listings = asset.listings;

      if (listings && listings.length > 0) {
        await this.prisma.listing.update({
          where: {
            assetAddress_closedAt: {
              assetAddress: address,
              closedAt: new Date(0),
            },
          },
          data: {
            closedAt: new Date(),
          },
        });
      }
    } catch (e) {
      console.error(ERROR_MESSAGES.ASSET_TRANSFER_FAILED(address));
    }
  }

  /**
   * Handles changes to the core comic state by updating metadata and nonce if applicable.
   */
  private async handleChangeCoreCollectibleComicState(
    updateInstruction: Instruction | InnerInstruction,
    transactionSignature: string,
  ) {
    try {
      try {
        // Update nonce account if used in ChangeCoreComicState transaction
        const transactionData = await this.umi.rpc.getTransaction(
          base58.serialize(transactionSignature),
        );
        const blockhash = transactionData.message.blockhash;

        const nonce = await this.prisma.durableNonce.findFirst({
          where: { nonce: blockhash },
        });
        if (nonce) {
          await this.nonceService.updateNonce(new PublicKey(nonce.address));
        }
      } catch (e) {
        console.error(ERROR_MESSAGES.NONCE_UPDATE_FAILED);
      }

      const updateSerializer = getUpdateV1InstructionDataSerializer();
      const updateArgs = updateSerializer.deserialize(
        bs58.decode(updateInstruction.data),
      )[0];

      const uri =
        updateArgs.newUri.__option == 'Some' ? updateArgs.newUri.value : null;
      const mint = updateInstruction.accounts.at(0);

      if (uri) {
        const offChainMetadata = await fetchOffChainMetadata(uri);
        const assetData = await fetchAssetV1(this.umi, publicKey(mint));
        await this.prisma.collectibleComic.update({
          where: { address: mint },
          include: {
            digitalAsset: true,
            metadata: {
              include: {
                collection: {
                  include: {
                    comicIssue: { include: { statefulCovers: true } },
                  },
                },
              },
            },
          },
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
                  collectionAddress:
                    assetData.updateAuthority.address.toString(),
                },
              },
            },
          },
        });
      }
    } catch (e) {
      console.error(ERROR_MESSAGES.COMIC_STATE_UPDATE_FAILED, e);
    }
  }

  /**
   * Handles mint events for core assets by confirming transactions and updating receipts.
   */
  private async handleCoreCollectibleComicMintEvent(
    enrichedTransaction: EnrichedTransaction,
  ) {
    const baseInstruction = enrichedTransaction.instructions.at(-1);
    const candyMachineAddress = baseInstruction.accounts[2];
    const collectionAddress = baseInstruction.accounts[8];

    const receipt = await this.prisma.candyMachineReceipt.findFirst({
      where: { transactionSignature: enrichedTransaction.signature },
    });
    let userId: number = undefined;

    const assetAccounts: string[] = [];
    enrichedTransaction.instructions.forEach((instruction) => {
      const isMintInstruction =
        instruction.programId.toString() ===
        MPL_CORE_CANDY_GUARD_PROGRAM_ID.toString();

      if (isMintInstruction) {
        const assetAddress = instruction.accounts.at(7);
        assetAccounts.push(assetAddress);
      }
    });

    let comicIssueAssets: IndexCoreAssetReturnType[];
    try {
      comicIssueAssets = await this.indexCoreAssets(
        assetAccounts,
        candyMachineAddress,
        collectionAddress,
        receipt.id,
      );
      userId = comicIssueAssets[0].digitalAsset.owner?.userId;
    } catch (e) {
      console.error(e);
    }

    try {
      const receiptData: Prisma.CandyMachineReceiptUpdateInput = {
        timestamp: new Date(enrichedTransaction.timestamp * 1000),
        status: TransactionStatus.Confirmed,
      };

      if (userId) {
        receiptData.user = {
          connect: { id: userId },
        };
      }
      const updatedReceipt = await this.prisma.candyMachineReceipt.update({
        where: { id: receipt.id },
        include: { user: true },
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

      await this.websocketGateway.handleWalletCollectibleComicMinted({
        ...updatedReceipt,
        comicIssueAssets,
      });
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Handles the buying of core assets by updating ownership and listing information.
   */
  async handleTensorBuying(
    buyer: string,
    mint: string,
    price: number,
    signature: string,
  ) {
    try {
      await this.prisma.collectibleComic.update({
        where: { address: mint },
        data: {
          digitalAsset: {
            update: {
              owner: {
                connectOrCreate: {
                  where: { address: buyer },
                  create: {
                    address: buyer,
                    createdAt: new Date(),
                  },
                },
              },
              ownerChangedAt: new Date(),
              listings: {
                update: {
                  where: {
                    assetAddress_closedAt: {
                      assetAddress: mint,
                      closedAt: new Date(0),
                    },
                  },
                  data: {
                    closedAt: new Date(),
                    sale: {
                      create: {
                        soldAt: new Date(),
                        auctionHouse: {
                          connect: {
                            address: TCOMP_PROGRAM_ID,
                          },
                        },
                        signature: signature,
                        price: price,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
    } catch (e) {
      console.error(ERROR_MESSAGES.BUY_ASSET_FAILED, e);
    }
  }

  async handleCancelTensorListing(mint: string) {
    await this.prisma.listing.update({
      where: {
        assetAddress_closedAt: {
          assetAddress: mint,
          closedAt: new Date(0),
        },
      },
      data: { closedAt: new Date() },
    });
  }

  /**
   * Handles the listing of core assets by updating or creating listings in the database.
   */
  async handleTensorListing(
    seller: string,
    mint: string,
    price: number,
    signature: string,
  ) {
    await this.prisma.collectibleComic.update({
      where: { address: mint },
      data: {
        digitalAsset: {
          update: {
            listings: {
              upsert: {
                where: {
                  assetAddress_closedAt: {
                    assetAddress: mint,
                    closedAt: new Date(0),
                  },
                },
                update: {
                  price,
                  sellerAddress: seller,
                  signature,
                  createdAt: new Date(),
                  source: Source.TENSOR,
                },
                create: {
                  price,
                  sellerAddress: seller,
                  signature,
                  createdAt: new Date(),
                  closedAt: new Date(0),
                  auctionHouse: {
                    connect: {
                      address: TCOMP_PROGRAM_ID,
                    },
                  },
                  source: Source.TENSOR,
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Handles changes to comic state by verifying metadata and updating the collectible comic.
   */
  private async handleChangeLegacyCollectibleComicState(
    transaction: EnrichedTransaction,
  ) {
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

        await this.prisma.collectibleComic.update({
          where: { address: mint },
          include: {
            digitalAsset: true,
            metadata: {
              include: {
                collection: {
                  include: {
                    comicIssue: { include: { statefulCovers: true } },
                  },
                },
              },
            },
          },
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
                  collectionAddress: collection.address.toString(),
                },
              },
            },
          },
        });
      }
    } catch (e) {
      console.error('Failed to handle comic state update', e);
    }
  }

  /**
   * Handles legacy collectible comic transfer events by updating ownership and notifying relevant parties.
   */
  private async handleLegacyCollectibleComicTransfer(
    instruction: Instruction | InnerInstruction,
    signature: string,
  ) {
    try {
      const address = instruction.accounts.at(0);
      const ownerAddress = instruction.accounts.at(2);

      const latestBlockhash = await this.metaplex.rpc().getLatestBlockhash();

      await this.metaplex
        .rpc()
        .confirmTransaction(signature, { ...latestBlockhash }, 'confirmed');

      await this.prisma.collectibleComic.update({
        where: { address },
        include: {
          digitalAsset: {
            include: { listings: { where: { closedAt: new Date(0) } } },
          },
          metadata: {
            include: {
              collection: {
                include: { comicIssue: { include: { statefulCovers: true } } },
              },
            },
          },
        },
        data: {
          digitalAsset: {
            update: {
              owner: {
                connectOrCreate: {
                  where: {
                    address: ownerAddress,
                  },
                  create: {
                    address: ownerAddress,
                    createdAt: new Date(),
                  },
                },
              },
              ownerChangedAt: new Date(),
            },
          },
        },
      });
    } catch (e) {
      console.error(ERROR_MESSAGES.LEGACY_ASSET_TRANSFER_FAILED);
    }
  }

  /**
   * Generates a JWT header for webhook authentication.
   */
  private generateJwtHeader() {
    const token = jwt.sign({ webhook: true }, process.env.JWT_ACCESS_SECRET, {
      expiresIn: '7d',
    });

    return `Bearer ${token}`;
  }

  /**
   * Verifies if the metadata account is valid and associated with a collection in the database.
   */
  async verifyMetadataAccount(collection: {
    address: PublicKey;
    verified: boolean;
  }) {
    return (
      collection.verified &&
      !!(await this.prisma.collectibleComicCollection.findFirst({
        where: { address: collection.address.toString() },
      }))
    );
  }

  /**
   * Re-indexes an asset based on its metadata and updates the database accordingly.
   */
  async reIndexAsset(asset: DAS.GetAssetResponse, candMachineAddress: string) {
    const updateAuthority = asset.authorities.find((authority) =>
      authority.scopes.find(
        (scope) => scope == Scope.METADATA || scope == Scope.FULL,
      ),
    );
    const { group_value: collection } = asset.grouping.find(
      (group) => group.group_key == 'collection',
    );
    const uri = asset.content.json_uri;
    const mintAddress = asset.id;
    const walletAddress = asset.ownership.owner;
    const collectionMetadata = await fetchOffChainMetadata(uri);

    if (asset.interface == Interface.PROGRAMMABLENFT) {
      try {
        if (
          updateAuthority.address ===
          this.metaplex.identity().publicKey.toString()
        ) {
          await delegateAuthority(
            this.metaplex,
            new PublicKey(candMachineAddress),
            new PublicKey(collection),
            findRarityTrait(collectionMetadata).toString(),
            new PublicKey(mintAddress),
          );
        }
      } catch (e) {
        console.error(e);
      }

      try {
        if (!asset.creators[1].verified) {
          await verifyMintCreator(this.metaplex, new PublicKey(mintAddress));
        }
      } catch (e) {
        console.error(e);
      }
    }

    const digitalAsset = await this.prisma.digitalAsset.upsert({
      where: { address: mintAddress.toString() },
      include: { collectibleComic: true, owner: { select: { userId: true } } },
      create: {
        address: mintAddress.toString(),
        ownerChangedAt: new Date(),
        owner: {
          connectOrCreate: {
            where: { address: walletAddress },
            create: { address: walletAddress },
          },
        },
        collectibleComic: {
          create: {
            name: asset.content.metadata.name,
            candyMachine: { connect: { address: candMachineAddress } },
            metadata: {
              connectOrCreate: {
                where: { uri },
                create: {
                  collectionName: collectionMetadata.collection.name,
                  uri,
                  isUsed: findUsedTrait(collectionMetadata),
                  isSigned: findSignedTrait(collectionMetadata),
                  rarity: findRarityTrait(collectionMetadata),
                  collectionAddress: collection,
                },
              },
            },
          },
        },
      },
      update: {
        ownerChangedAt: new Date(),
        owner: {
          connectOrCreate: {
            where: { address: walletAddress },
            create: { address: walletAddress },
          },
        },
        collectibleComic: {
          update: {
            metadata: {
              connectOrCreate: {
                where: { uri },
                create: {
                  collectionName: collectionMetadata.collection.name,
                  uri,
                  isUsed: findUsedTrait(collectionMetadata),
                  isSigned: findSignedTrait(collectionMetadata),
                  rarity: findRarityTrait(collectionMetadata),
                  collectionAddress: collection,
                },
              },
            },
          },
        },
      },
    });

    await this.subscribeTo(mintAddress);
    return digitalAsset;
  }

  /**
   * Indexes core assets by fetching off-chain metadata and creating/updating records in the database.
   */
  async indexCoreAssets(
    assetAccounts: string[],
    candMachineAddress: string,
    collectionAddress: string,
    receiptId: number,
  ) {
    const digitalAssets: IndexCoreAssetReturnType[] = [];

    for await (const assetAddress of assetAccounts) {
      const asset = await getAsset(assetAddress);
      if (!asset) continue;

      const uri = asset.content.json_uri;
      const name = asset.content.metadata.name;
      const publicKey = asset.id;
      const ownerAddress = asset.ownership.owner;

      const offChainMetadata = await fetchOffChainMetadata(uri);
      const isUsed = findUsedTrait(offChainMetadata);
      const isSigned = findSignedTrait(offChainMetadata);
      const rarity = findRarityTrait(offChainMetadata);

      const digitalAsset = await this.prisma.collectibleComic.upsert({
        where: {
          address: assetAddress,
        },
        include: {
          metadata: {
            include: { collection: { select: { comicIssueId: true } } },
          },
          digitalAsset: { include: { owner: { select: { userId: true } } } },
        },
        update: {
          metadata: {
            connectOrCreate: {
              where: { uri },
              create: {
                collectionName: offChainMetadata.name,
                uri,
                isUsed,
                isSigned,
                rarity,
                collectionAddress,
              },
            },
          },
          receipt: { connect: { id: receiptId } },
        },
        create: {
          name,
          candyMachine: { connect: { address: candMachineAddress } },
          metadata: {
            connectOrCreate: {
              where: { uri },
              create: {
                collectionName: offChainMetadata.name,
                uri,
                isUsed,
                isSigned,
                rarity,
                collectionAddress,
              },
            },
          },
          receipt: { connect: { id: receiptId } },
          digitalAsset: {
            create: {
              address: assetAddress,
              owner: {
                connectOrCreate: {
                  where: { address: ownerAddress },
                  create: { address: ownerAddress },
                },
              },
              ownerChangedAt: new Date(),
            },
          },
        },
      });

      const comicIssueId = digitalAsset.metadata.collection.comicIssueId;
      const cover = await this.prisma.statefulCover.findUnique({
        where: {
          comicIssueId_isSigned_isUsed_rarity: {
            comicIssueId,
            isSigned,
            isUsed,
            rarity,
          },
        },
      });

      digitalAssets.push({ ...digitalAsset, image: cover.image });
      await this.subscribeTo(publicKey);
    }

    return digitalAssets;
  }

  /**
   * Indexes an asset based on its metadata and updates the database accordingly.
   */
  async indexAsset(
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

    const asset = await this.prisma.collectibleComic.create({
      include: {
        metadata: {
          include: { collection: { select: { comicIssueId: true } } },
        },
        digitalAsset: { include: { owner: { select: { userId: true } } } },
      },
      data: {
        name: metadataOrNft.name,
        candyMachine: { connect: { address: candMachineAddress } },
        metadata: {
          connectOrCreate: {
            where: { uri: metadataOrNft.uri },
            create: {
              collectionName: collectionMetadata.collection.name,
              uri: metadataOrNft.uri,
              isUsed: findUsedTrait(collectionMetadata),
              isSigned: findSignedTrait(collectionMetadata),
              rarity: findRarityTrait(collectionMetadata),
              collectionAddress: metadataOrNft.collection.address.toString(),
            },
          },
        },
        digitalAsset: {
          create: {
            address: mintAddress.toString(),
            ownerChangedAt: new Date(),
            owner: {
              connectOrCreate: {
                where: { address: walletAddress },
                create: { address: walletAddress },
              },
            },
          },
        },
      },
    });
    await this.subscribeTo(mintAddress.toString());
    return asset;
  }

  /**
   * Refreshes the webhook token daily to maintain authentication.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async refreshWebhookToken() {
    if (!this.webhookID) return;

    await this.helius.editWebhook(this.webhookID, {
      authHeader: this.generateJwtHeader(),
    });

    console.info('Webhook auth token refreshed');
  }
}
