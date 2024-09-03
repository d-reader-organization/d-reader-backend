import { Injectable } from '@nestjs/common';
import { Cluster, PublicKey } from '@solana/web3.js';
import {
  DAS,
  EnrichedTransaction,
  Helius,
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
  AUTHORITY_GROUP_LABEL,
  CHANGE_COMIC_STATE_ACCOUNT_LEN,
  CMA_PROGRAM_ID,
  MINT_CORE_V1_DISCRIMINATOR,
  SOL_ADDRESS,
  TCOMP_PROGRAM_ID,
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
import { getAssetFromTensor } from '../../utils/das';
import { TENSOR_ASSET } from './dto/types';
import { findAssociatedTokenPda } from '@metaplex-foundation/mpl-toolbox';
import { AssetInput } from '../../digital-asset/dto/digital-asset.dto';
import { ListingInput } from '../../auction-house/dto/listing.dto';

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
      console.error(`Failed to subscribe to address ${address}`);
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
          case TransactionType.NFT_MINT:
            return this.handleMintEvent(transaction);
          case TransactionType.TRANSFER:
            return this.handleAssetTransfer(transaction);
          case TransactionType.NFT_LISTING:
            return this.handleNftListing(transaction);
          case TransactionType.NFT_CANCEL_LISTING:
            return this.handleCancelListing(transaction);
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
            } else if (instruction.programId == TCOMP_PROGRAM_ID) {
              return this.handleCoreSecondary(transaction);
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

      const asset = await this.prisma.collectibleComic.update({
        where: { address },
        include: {
          digitalAsset: {
            include: { listings: { where: { closedAt: new Date(0) } } },
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
                    createdAt: new Date(enrichedTransaction.timestamp * 1000),
                  },
                },
              },
              ownerChangedAt: new Date(enrichedTransaction.timestamp * 1000),
            },
          },
        },
      });
      const listings = asset.digitalAsset.listings;

      if (listings && listings.length > 0) {
        await this.prisma.listing.update({
          where: {
            assetAddress_closedAt: {
              assetAddress: address,
              closedAt: new Date(0),
            },
          },
          data: {
            closedAt: new Date(enrichedTransaction.timestamp * 1000),
          },
        });
      }

      this.websocketGateway.handleWalletAssetReceived(ownerAddress, asset);
      this.websocketGateway.handleWalletAssetSent(previousOwner, asset);
    } catch (e) {
      console.error(
        `Failed to index Core Asset ${address} While transfer event`,
      );
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
      const mint = updateInstruction.accounts.at(0);

      if (uri) {
        const offChainMetadata = await fetchOffChainMetadata(uri);
        const assetData = await fetchAssetV1(this.umi, publicKey(mint));
        const collectibleComic = await this.prisma.collectibleComic.update({
          where: { address: mint },
          include: { digitalAsset: true },
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
        this.websocketGateway.handleWalletAssetUsed(collectibleComic);
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
      const comicIssueAsset = await this.indexCoreAsset(
        nft,
        offChainMetadata,
        ownerAddress,
        candyMachineAddress,
      );

      comicIssueId = comicIssueAsset.metadata.collection.comicIssueId;
      userId = comicIssueAsset.digitalAsset.owner?.userId;
      await this.subscribeTo(comicIssueAsset.address);
    } catch (e) {
      console.error(e);
    }

    try {
      const ixData = mintV1Serializer.deserialize(
        bs58.decode(mintInstruction.data),
      )[0];
      const label =
        ixData.group.__option == 'Some' ? ixData.group.value : undefined;

      let splTokenAddress = SOL_ADDRESS;
      let balanceTransferAddress = ownerAddress;
      if (label && label !== AUTHORITY_GROUP_LABEL) {
        const group = await this.prisma.candyMachineGroup.findUnique({
          where: { label_candyMachineAddress: { label, candyMachineAddress } },
        });
        splTokenAddress = group.splTokenAddress;
        balanceTransferAddress =
          splTokenAddress == SOL_ADDRESS
            ? ownerAddress
            : findAssociatedTokenPda(this.umi, {
                mint: publicKey(group.splTokenAddress),
                owner: publicKey(ownerAddress),
              })[0];
      }

      const ownerAccountData = enrichedTransaction.accountData.find(
        (data) => data.account == balanceTransferAddress,
      );
      const price =
        splTokenAddress === SOL_ADDRESS
          ? Math.abs(ownerAccountData.nativeBalanceChange)
          : Math.abs(
              +ownerAccountData.tokenBalanceChanges.find(
                (balance) => balance.mint === splTokenAddress,
              ).rawTokenAmount.tokenAmount,
            );

      const receiptData: Prisma.CandyMachineReceiptCreateInput = {
        collectibleComic: { connect: { address: mint } },
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
        label,
      };

      if (userId) {
        receiptData.user = {
          connect: { id: userId },
        };
      }
      const receipt = await this.prisma.candyMachineReceipt.create({
        include: { collectibleComic: true, buyer: { include: { user: true } } },
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

      this.websocketGateway.handleAssetMinted(comicIssueId, receipt);
      this.websocketGateway.handleWalletAssetMinted(receipt);
    } catch (e) {
      console.error(e);
    }
  }

  private async handleCoreSecondary(transaction: EnrichedTransaction) {
    const instruction = transaction.instructions.at(-1);
    const coreProgramInstruction = instruction.innerInstructions.find(
      (ixs) => ixs.programId === MPL_CORE_PROGRAM_ID.toString(),
    );
    const mint = coreProgramInstruction.accounts.at(0);
    const assetInfo = await getAssetFromTensor(mint);
    if (assetInfo.listing && assetInfo.listing.seller) {
      return this.handleCoreListing(assetInfo);
    } else {
      return this.handleCoreBuying(transaction, assetInfo);
    }
  }

  private async handleCoreBuying(
    transaction: EnrichedTransaction,
    assetInfo: TENSOR_ASSET,
  ) {
    const mint = assetInfo.onchainId;
    try {
      const collectibleComic = await this.prisma.collectibleComic.update({
        where: { address: mint },
        include: {
          metadata: { include: { collection: true } },
          digitalAsset: {
            include: {
              listings: {
                where: {
                  assetAddress: mint,
                  closedAt: new Date(transaction.timestamp * 1000),
                },
              },
              owner: { include: { user: true } },
            },
          },
        },
        data: {
          digitalAsset: {
            update: {
              owner: {
                connectOrCreate: {
                  where: { address: assetInfo.owner },
                  create: {
                    address: assetInfo.owner,
                    createdAt: new Date(transaction.timestamp * 1000),
                  },
                },
              },
              ownerChangedAt: new Date(transaction.timestamp * 1000),
              listings: {
                update: {
                  where: {
                    assetAddress_closedAt: {
                      assetAddress: mint,
                      closedAt: new Date(0),
                    },
                  },
                  data: {
                    closedAt: new Date(transaction.timestamp * 1000),
                    sale: {
                      create: {
                        soldAt: new Date(transaction.timestamp * 1000),
                        auctionHouse: {
                          connect: {
                            address: TCOMP_PROGRAM_ID,
                          },
                        },
                        signature: transaction.signature,
                        price: assetInfo.listing.price,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const { digitalAsset, metadata } = collectibleComic;
      const listing = digitalAsset.listings[0];
      const collection = metadata.collection;

      const listingInput: ListingInput = {
        ...listing,
        digitalAsset: { ...digitalAsset, collectibleComic },
      };

      this.websocketGateway.handleAssetSold(
        collection.comicIssueId,
        listingInput,
      );
      this.websocketGateway.handleWalletAssetBought(
        digitalAsset.ownerAddress,
        collectibleComic,
      );
    } catch (e) {
      console.error('Error in buy core asset webhook', e);
    }
  }

  private async handleCoreListing(assetInfo: TENSOR_ASSET) {
    const { listing, onchainId: mint } = assetInfo;

    const collectibleComic = await this.prisma.collectibleComic.update({
      where: { address: mint },
      include: {
        metadata: { include: { collection: true } },
        digitalAsset: {
          include: {
            owner: { include: { user: true } },
            listings: {
              where: { assetAddress: mint, closedAt: new Date(0) },
            },
          },
        },
      },
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
                  price: listing.price,
                  sellerAddress: listing.seller,
                  signature: listing.txId,
                  createdAt: new Date(),
                  source:
                    listing.source === 'TCOMP' ? Source.TENSOR : Source.UNKNOWN,
                },
                create: {
                  price: listing.price,
                  sellerAddress: listing.seller,
                  signature: listing.txId,
                  createdAt: new Date(),
                  closedAt: new Date(0),
                  auctionHouse: {
                    connect: {
                      address: TCOMP_PROGRAM_ID,
                    },
                  },
                  source:
                    listing.source === 'TCOMP' ? Source.TENSOR : Source.UNKNOWN,
                },
              },
            },
          },
        },
      },
    });

    const digitalAsset = collectibleComic.digitalAsset;
    const assetListing = digitalAsset.listings[0];
    const collection = collectibleComic.metadata.collection;

    const listingInput: ListingInput = {
      ...assetListing,
      digitalAsset: { ...digitalAsset, collectibleComic },
    };
    this.websocketGateway.handleAssetListed(
      collection.comicIssueId,
      listingInput,
    );
    this.websocketGateway.handleWalletAssetListed(
      digitalAsset.ownerAddress,
      collectibleComic,
    );
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

        const collectibleComic = await this.prisma.collectibleComic.update({
          where: { address: mint },
          include: { digitalAsset: true },
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
        this.websocketGateway.handleWalletAssetUsed(collectibleComic);
      }
    } catch (e) {
      console.error('Failed to handle comic state update', e);
    }
  }

  private async handleCancelListing(transaction: EnrichedTransaction) {
    try {
      const mint = transaction.events.nft.nfts[0].mint; // only 1 token would be involved
      const listing = await this.prisma.listing.update({
        where: {
          assetAddress_closedAt: {
            assetAddress: mint,
            closedAt: new Date(0),
          },
        },
        include: {
          digitalAsset: {
            include: {
              owner: { include: { user: true } },
              collectibleComic: {
                include: {
                  metadata: { include: { collection: true } },
                },
              },
            },
          },
        },
        data: {
          closedAt: new Date(transaction.timestamp * 1000),
        },
      });

      const comicIssueId =
        listing.digitalAsset.collectibleComic.metadata.collection.comicIssueId;
      this.websocketGateway.handleAssetDelisted(comicIssueId, listing);

      const collectibleComic: AssetInput = {
        ...listing.digitalAsset.collectibleComic,
        digitalAsset: listing.digitalAsset,
      };

      this.websocketGateway.handleWalletAssetDelisted(
        listing.digitalAsset.ownerAddress,
        collectibleComic,
      );
    } catch (e) {
      console.error('Failed to handle cancel listing', e);
    }
  }

  private async handleNftListing(transaction: EnrichedTransaction) {
    try {
      const mint = transaction.events.nft.nfts[0].mint; // only 1 token would be involved for a nft listing
      const price = transaction.events.nft.amount;
      const sellerAddress = transaction.feePayer;
      const signature = transaction.signature;
      const createdAt = new Date(transaction.timestamp * 1000);
      const collectibleComic = await this.prisma.collectibleComic.update({
        where: { address: mint },
        include: {
          metadata: { include: { collection: true } },
          digitalAsset: {
            include: {
              owner: { include: { user: true } },
              listings: {
                where: { assetAddress: mint, closedAt: new Date(0) },
              },
            },
          },
        },
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
                    sellerAddress,
                    signature,
                    createdAt: new Date(),
                    source: transaction.source,
                  },
                  create: {
                    auctionHouse: {
                      connect: { address: TCOMP_PROGRAM_ID },
                    },
                    price,
                    sellerAddress,
                    signature,
                    createdAt,
                    closedAt: new Date(0),
                    source: transaction.source,
                  },
                },
              },
            },
          },
        },
      });

      const { digitalAsset, metadata } = collectibleComic;
      const listing = digitalAsset.listings[0];
      const comicIssueId = metadata.collection.comicIssueId;

      const listingInput: ListingInput = {
        ...listing,
        digitalAsset: { ...digitalAsset, collectibleComic },
      };

      this.websocketGateway.handleAssetListed(comicIssueId, listingInput);
      this.websocketGateway.handleWalletAssetListed(
        digitalAsset.ownerAddress,
        collectibleComic,
      );
    } catch (e) {
      console.error('Failed to handle Asset listing', e);
    }
  }

  private async handleAssetTransfer(enrichedTransaction: EnrichedTransaction) {
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

      const collectibleComic = await this.prisma.collectibleComic.update({
        where: { address },
        include: {
          digitalAsset: {
            include: { listings: { where: { closedAt: new Date(0) } } },
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
                    createdAt: new Date(enrichedTransaction.timestamp * 1000),
                  },
                },
              },
              ownerChangedAt: new Date(enrichedTransaction.timestamp * 1000),
            },
          },
        },
      });

      const digitalAsset = collectibleComic.digitalAsset;
      const listings = digitalAsset.listings;

      if (listings && listings.length > 0) {
        await this.prisma.listing.update({
          where: {
            assetAddress_closedAt: {
              assetAddress: address,
              closedAt: new Date(0),
            },
          },
          data: {
            closedAt: new Date(enrichedTransaction.timestamp * 1000),
          },
        });
      }

      this.websocketGateway.handleWalletAssetReceived(
        ownerAddress,
        collectibleComic,
      );
      this.websocketGateway.handleWalletAssetSent(
        previousOwner,
        collectibleComic,
      );
    } catch (e) {
      console.error('Failed to handle Asset transfer', e);
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
      const comicIssueAsset = await this.indexAsset(
        metadata,
        offChainMetadata,
        ownerAddress,
        candyMachineAddress,
      );

      comicIssueId = comicIssueAsset.metadata.collection.comicIssueId;
      userId = comicIssueAsset.digitalAsset.owner?.userId;
      await this.subscribeTo(comicIssueAsset.address);
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
        collectibleComic: { connect: { address: mint.toBase58() } },
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
        include: { collectibleComic: true, buyer: { include: { user: true } } },
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

      this.websocketGateway.handleAssetMinted(comicIssueId, receipt);
      this.websocketGateway.handleWalletAssetMinted(receipt);
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
      const collection = await this.prisma.collectibleComicCollection.findFirst(
        {
          where: { address: collectionNftAddress },
        },
      );
      this.websocketGateway.handleAssetMintRejected(collection.comicIssueId);
      this.websocketGateway.handleWalletAssetMintRejected(
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
      !!(await this.prisma.collectibleComicCollection.findFirst({
        where: { address: collection.address.toString() },
      }))
    );
  }

  async reIndexAsset(asset: DAS.GetAssetResponse, candMachineAddress: string) {
    const updateAuthority = asset.authorities.find((authority) =>
      authority.scopes.find((scope) => scope == Scope.METADATA),
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

    const digitalAsset = await this.prisma.collectibleComic.upsert({
      where: { address: mintAddress.toString() },
      include: {
        digitalAsset: { include: { owner: { select: { userId: true } } } },
      },
      update: {
        digitalAsset: {
          update: {
            // TODO: this should fetch the info on when the owner changed from chain
            ownerChangedAt: new Date(0),
            owner: {
              connectOrCreate: {
                where: { address: walletAddress },
                create: { address: walletAddress },
              },
            },
          },
        },
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

    await this.subscribeTo(mintAddress);
    return digitalAsset;
  }

  async indexCoreAsset(
    asset: AssetV1,
    offChainMetadata: JsonMetadata,
    walletAddress: string,
    candMachineAddress: string,
  ) {
    const digitalAsset = await this.prisma.collectibleComic.create({
      include: {
        metadata: {
          include: { collection: { select: { comicIssueId: true } } },
        },
        digitalAsset: { include: { owner: { select: { userId: true } } } },
      },
      data: {
        name: asset.name,
        candyMachine: { connect: { address: candMachineAddress } },
        metadata: {
          connectOrCreate: {
            where: { uri: asset.uri },
            create: {
              collectionName: offChainMetadata.name,
              uri: asset.uri,
              isUsed: findUsedTrait(offChainMetadata),
              isSigned: findSignedTrait(offChainMetadata),
              rarity: findRarityTrait(offChainMetadata),
              collectionAddress: asset.updateAuthority.address.toString(),
            },
          },
        },
        digitalAsset: {
          create: {
            address: asset.publicKey.toString(),
            owner: {
              connectOrCreate: {
                where: { address: walletAddress },
                create: { address: walletAddress },
              },
            },
            ownerChangedAt: new Date(),
          },
        },
      },
    });

    await this.subscribeTo(asset.publicKey.toString());
    return digitalAsset;
  }

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
