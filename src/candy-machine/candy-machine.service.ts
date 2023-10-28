import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Keypair,
  PublicKey,
  SYSVAR_SLOT_HASHES_PUBKEY,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { PrismaService } from 'nestjs-prisma';
import {
  Metaplex,
  toBigNumber,
  TransactionBuilder,
  DefaultCandyGuardSettings,
  CandyMachine,
  JsonMetadata,
  getMerkleRoot,
  toDateTime,
  CreateCandyMachineInput,
  WRAPPED_SOL_MINT,
  AllowListGuardSettings,
} from '@metaplex-foundation/js';
import { s3toMxFile } from '../utils/files';
import {
  constructChangeComicStateTransaction,
  constructMintOneTransaction,
  initializeRecordAuthority,
} from './instructions';
import { HeliusService } from '../webhooks/helius/helius.service';
import { CandyMachineReceiptParams } from './dto/candy-machine-receipt-params.dto';
import { chunk } from 'lodash';
import * as bs58 from 'bs58';
import {
  MAX_METADATA_LEN,
  CREATOR_ARRAY_START,
  D_PUBLISHER_SYMBOL,
  HUNDRED,
  D_READER_FRONTEND_URL,
  BOT_TAX,
  FREEZE_NFT_DAYS,
  DAY_SECONDS,
  RARITY_MAP,
  AUTHORITY_GROUP_LABEL,
  PUBLIC_GROUP_LABEL,
  PUBLIC_GROUP_MINT_LIMIT_ID,
  rateLimitQuota,
} from '../constants';
import { solFromLamports } from '../utils/helpers';
import { MetdataFile, metaplex, writeFiles } from '../utils/metaplex';
import {
  findDefaultCover,
  getStatefulCoverName,
  validateComicIssueCMInput,
} from '../utils/comic-issue';
import { ComicIssueCMInput } from '../comic-issue/dto/types';
import { GuardGroup, RarityCoverFiles } from '../types/shared';
import {
  generatePropertyName,
  uploadItemMetadata,
} from '../utils/nft-metadata';
import { ComicStateArgs } from 'dreader-comic-verse';
import { DarkblockService } from './darkblock.service';
import { CandyMachineParams } from './dto/candy-machine-params.dto';
import { Prisma } from '@prisma/client';
import { CandyMachineGroupSettings, GuardParams } from './dto/types';
import { constructCandyMachineTransaction } from './instructions/initialize-candy-machine';
import { constructThawTransaction } from './instructions/route';
import { createLookupTable } from '../utils/lookup-table';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { pRateLimit } from 'p-ratelimit';

type JsonMetadataCreators = JsonMetadata['properties']['creators'];

@Injectable()
export class CandyMachineService {
  private readonly metaplex: Metaplex;

  constructor(
    private readonly prisma: PrismaService,
    private readonly heliusService: HeliusService,
    private readonly darkblockService: DarkblockService,
  ) {
    this.metaplex = metaplex;
  }

  async findMintedNfts(candyMachineAddress: string) {
    const candyMachineId = new PublicKey(candyMachineAddress);
    const candyMachineCreator = PublicKey.findProgramAddressSync(
      [Buffer.from('candy_machine'), candyMachineId.toBuffer()],
      this.metaplex.programs().getCandyMachine().address,
    );

    return await this.getMintAddresses(candyMachineCreator[0]);
  }

  async getMintAddresses(firstCreatorAddress: PublicKey) {
    const metadataAccounts = await this.metaplex.connection.getProgramAccounts(
      this.metaplex.programs().getTokenMetadata().address,
      {
        // The mint address is located at byte 33 and lasts for 32 bytes.
        dataSlice: { offset: 33, length: 32 },
        filters: [
          // Only get Metadata accounts.
          { dataSize: MAX_METADATA_LEN },
          // Filter using the first creator.
          {
            memcmp: {
              offset: CREATOR_ARRAY_START,
              bytes: firstCreatorAddress.toBase58(),
            },
          },
        ],
      },
    );

    return metadataAccounts.map((metadataAccountInfo) =>
      bs58.encode(metadataAccountInfo.account.data),
    );
  }

  async getComicIssueCovers(comicIssue: ComicIssueCMInput) {
    const statelessCoverPromises = comicIssue.statelessCovers.map((cover) =>
      s3toMxFile(cover.image),
    );
    const statelessCovers = await Promise.all(statelessCoverPromises);

    const rarityCoverFiles: RarityCoverFiles = {} as RarityCoverFiles;
    const statefulCoverPromises = comicIssue.statefulCovers.map(
      async (cover) => {
        const file = await s3toMxFile(cover.image, getStatefulCoverName(cover));
        const property = generatePropertyName(cover.isUsed, cover.isSigned);
        const value = {
          ...rarityCoverFiles[cover.rarity],
          [property]: file,
        };
        rarityCoverFiles[cover.rarity] = value;
        return file;
      },
    );
    const statefulCovers = await Promise.all(statefulCoverPromises);

    return { statefulCovers, statelessCovers, rarityCoverFiles };
  }

  async initializeGuardAccounts(
    candyMachine: CandyMachine<DefaultCandyGuardSettings>,
    freezePeriod?: number,
  ) {
    await this.metaplex.candyMachines().callGuardRoute({
      candyMachine,
      guard: 'freezeSolPayment',
      settings: {
        path: 'initialize',
        period: (freezePeriod ?? FREEZE_NFT_DAYS) * DAY_SECONDS,
        candyGuardAuthority: this.metaplex.identity(),
      },
      group: PUBLIC_GROUP_LABEL,
    });
  }

  async createComicIssueCM(
    comicIssue: ComicIssueCMInput,
    comicName: string,
    guardParams: GuardParams,
    shouldBePublic?: boolean,
  ) {
    validateComicIssueCMInput(comicIssue);

    const creatorAddress = comicIssue.creatorAddress;
    const creatorBackupAddress = comicIssue.creatorBackupAddress;
    const royaltyWallets: JsonMetadataCreators = comicIssue.royaltyWallets;

    const { statefulCovers, statelessCovers, rarityCoverFiles } =
      await this.getComicIssueCovers(comicIssue);

    const cover = findDefaultCover(comicIssue.statelessCovers);
    const coverImage = await s3toMxFile(cover.image);

    // if Collection NFT already exists - use it, otherwise create a fresh one
    let collectionNftAddress: PublicKey;
    const collectionNft = await this.prisma.collectionNft.findUnique({
      where: { comicIssueId: comicIssue.id },
    });

    const candyMachineKey = Keypair.generate();

    let darkblockId = '';
    if (collectionNft) {
      collectionNftAddress = new PublicKey(collectionNft.address);
    } else {
      let darkblockMetadataFile: MetdataFile;
      if (comicIssue.pdf) {
        darkblockId = await this.darkblockService.mintDarkblock(
          comicIssue.pdf,
          comicIssue.description,
          creatorAddress,
        );
        darkblockMetadataFile = {
          type: 'Darkblock',
          uri: darkblockId,
        };
      }

      const { uri: collectionNftUri } = await this.metaplex
        .nfts()
        .uploadMetadata({
          name: comicIssue.title,
          symbol: D_PUBLISHER_SYMBOL,
          description: comicIssue.description,
          seller_fee_basis_points: comicIssue.sellerFeeBasisPoints,
          image: coverImage,
          external_url: D_READER_FRONTEND_URL,
          properties: {
            creators: [
              {
                address: this.metaplex.identity().publicKey.toBase58(),
                share: HUNDRED,
              },
            ],
            files: [
              ...writeFiles(coverImage, ...statefulCovers, ...statelessCovers),
              darkblockMetadataFile,
            ],
          },
        });

      const { nft: newCollectionNft } = await this.metaplex.nfts().create({
        uri: collectionNftUri,
        name: comicIssue.title,
        sellerFeeBasisPoints: comicIssue.sellerFeeBasisPoints,
        symbol: D_PUBLISHER_SYMBOL,
        isCollection: true,
      });

      await this.prisma.collectionNft.create({
        data: {
          address: newCollectionNft.address.toBase58(),
          name: newCollectionNft.name,
          comicIssue: { connect: { id: comicIssue.id } },
        },
      });
      collectionNftAddress = newCollectionNft.address;
    }

    const creators: CreateCandyMachineInput['creators'] = royaltyWallets.map(
      (wallet) => ({
        address: new PublicKey(wallet.address),
        share: wallet.share,
      }),
    );
    const { startDate, endDate, mintLimit, freezePeriod, mintPrice, supply } =
      guardParams;

    await initializeRecordAuthority(
      this.metaplex,
      candyMachineKey.publicKey,
      collectionNftAddress,
      new PublicKey(creatorAddress),
      new PublicKey(creatorBackupAddress),
      supply,
    );
    const groups: {
      label: string;
      guards: Partial<DefaultCandyGuardSettings>;
    }[] = [
      {
        label: AUTHORITY_GROUP_LABEL,
        guards: {
          allowList: {
            merkleRoot: getMerkleRoot([
              this.metaplex.identity().publicKey.toString(),
            ]),
          },
          solPayment: {
            amount: solFromLamports(0),
            destination: this.metaplex.identity().publicKey,
          },
        },
      },
    ];
    if (!!shouldBePublic) {
      groups.push({
        label: PUBLIC_GROUP_LABEL,
        guards: {
          startDate: {
            date: toDateTime(startDate),
          },
          endDate: {
            date: toDateTime(endDate),
          },
          freezeSolPayment: {
            amount: solFromLamports(mintPrice),
            destination: this.metaplex.identity().publicKey,
          },
          mintLimit: mintLimit
            ? {
                id: PUBLIC_GROUP_MINT_LIMIT_ID,
                limit: mintLimit,
              }
            : undefined,
        },
      });
    }
    const candyMachineTx = await constructCandyMachineTransaction(
      this.metaplex,
      {
        candyMachine: candyMachineKey,
        authority: this.metaplex.identity().publicKey,
        collection: {
          address: collectionNftAddress,
          updateAuthority: this.metaplex.identity(),
        },
        symbol: D_PUBLISHER_SYMBOL,
        maxEditionSupply: toBigNumber(0),
        isMutable: true,
        sellerFeeBasisPoints: comicIssue.sellerFeeBasisPoints,
        itemsAvailable: toBigNumber(supply),
        guards: {
          botTax: {
            lamports: solFromLamports(BOT_TAX),
            lastInstruction: true,
          },
        },
        groups,
        creators: [
          {
            address: this.metaplex.identity().publicKey,
            share: 0,
          },
          ...creators,
        ],
      },
    );
    await sendAndConfirmTransaction(metaplex.connection, candyMachineTx, [
      metaplex.identity(),
      candyMachineKey,
    ]);

    const candyMachine = await this.metaplex
      .candyMachines()
      .findByAddress({ address: candyMachineKey.publicKey });
    if (shouldBePublic)
      await this.initializeGuardAccounts(candyMachine, freezePeriod);
    const authorityPda = this.metaplex
      .candyMachines()
      .pdas()
      .authority({ candyMachine: candyMachine.address })
      .toString();
    const lookupTable = await createLookupTable(metaplex, [
      candyMachine.address,
      metaplex.identity().publicKey,
      candyMachine.candyGuard.address,
      collectionNftAddress,
      metaplex.programs().getTokenMetadata().address,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
      SYSVAR_SLOT_HASHES_PUBKEY,
    ]);
    await this.prisma.candyMachine.create({
      data: {
        address: candyMachine.address.toBase58(),
        mintAuthorityAddress: candyMachine.mintAuthorityAddress.toBase58(),
        collectionNftAddress: candyMachine.collectionMintAddress.toBase58(),
        authorityPda,
        itemsAvailable: candyMachine.itemsAvailable.toNumber(),
        itemsMinted: candyMachine.itemsMinted.toNumber(),
        itemsRemaining: candyMachine.itemsRemaining.toNumber(),
        itemsLoaded: candyMachine.itemsLoaded, // TODO: this value should be loaded after inserting items?
        isFullyLoaded: candyMachine.isFullyLoaded,
        supply,
        lookupTable,
        groups: !!shouldBePublic
          ? {
              create: {
                displayLabel: PUBLIC_GROUP_LABEL,
                wallets: undefined,
                label: PUBLIC_GROUP_LABEL,
                startDate,
                endDate,
                mintPrice: mintPrice,
                mintLimit,
                supply,
                splTokenAddress: WRAPPED_SOL_MINT.toBase58(),
              },
            }
          : undefined,
      },
    });
    const items = await uploadItemMetadata(
      metaplex,
      candyMachine.address,
      comicIssue,
      collectionNftAddress,
      comicName,
      royaltyWallets,
      statelessCovers.length,
      darkblockId,
      supply,
      rarityCoverFiles,
    );

    const INSERT_CHUNK_SIZE = 8;
    const itemChunks = chunk(items, INSERT_CHUNK_SIZE);
    let index = 0;
    const transactionBuilders: TransactionBuilder[] = [];
    for (const itemsChunk of itemChunks) {
      console.info(`Inserting items ${index}-${index + itemsChunk.length} `);
      const transactionBuilder = this.metaplex
        .candyMachines()
        .builders()
        .insertItems({
          candyMachine,
          index,
          items: itemsChunk,
        });
      index += itemsChunk.length;
      transactionBuilders.push(transactionBuilder);
    }
    const rateLimit = pRateLimit(rateLimitQuota);
    for (const transactionBuilder of transactionBuilders) {
      const latestBlockhash =
        await this.metaplex.connection.getLatestBlockhash();
      const transaction = transactionBuilder.toTransaction(latestBlockhash);
      rateLimit(() => {
        return sendAndConfirmTransaction(
          this.metaplex.connection,
          transaction,
          [this.metaplex.identity()],
        );
      });
    }

    this.heliusService.subscribeTo(candyMachine.address.toBase58());
    return await this.metaplex.candyMachines().refresh(candyMachine);
  }

  async updateCandyMachine(
    candyMachineAddress: PublicKey,
    groups?: GuardGroup[],
    guards?: Partial<DefaultCandyGuardSettings>,
  ) {
    const candyMachine = await this.metaplex
      .candyMachines()
      .findByAddress({ address: candyMachineAddress });
    await this.metaplex.candyMachines().update({
      candyMachine,
      groups,
      guards,
    });
  }

  async createMintTransaction(
    feePayer: PublicKey,
    candyMachineAddress: PublicKey,
    label: string,
    mintCount?: number,
  ) {
    const transactions: Promise<string[]>[] = [];
    for (let i = 0; i < mintCount; i++) {
      transactions.push(
        this.createMintOneTransaction(feePayer, candyMachineAddress, label),
      );
    }
    return await Promise.all(transactions);
  }

  async createMintOneTransaction(
    feePayer: PublicKey,
    candyMachineAddress: PublicKey,
    label: string,
  ) {
    const balance = await this.metaplex.connection.getBalance(feePayer);
    if (balance < 30000000) {
      throw new Error("Wallet don't have enough funds!");
    }
    const { allowList, lookupTable } = await this.findCandyMachineData(
      candyMachineAddress.toString(),
      label,
    );
    return await constructMintOneTransaction(
      this.metaplex,
      feePayer,
      candyMachineAddress,
      label,
      allowList,
      lookupTable,
    );
  }

  async createChangeComicStateTransaction(
    mint: PublicKey,
    feePayer: PublicKey,
    newState: ComicStateArgs,
  ) {
    const {
      ownerAddress,
      collectionNftAddress,
      candyMachineAddress,
      metadata,
    } = await this.prisma.nft.findUnique({
      where: { address: mint.toString() },
      include: { metadata: true },
    });

    const owner = new PublicKey(ownerAddress);
    const collectionMintPubKey = new PublicKey(collectionNftAddress);
    const candyMachinePubKey = new PublicKey(candyMachineAddress);
    const numberedRarity = RARITY_MAP[metadata.rarity];

    return await constructChangeComicStateTransaction(
      this.metaplex,
      owner,
      collectionMintPubKey,
      candyMachinePubKey,
      numberedRarity,
      mint,
      feePayer,
      newState,
    );
  }

  async thawFrozenNft(
    candyMachineAddress: PublicKey,
    nftMint: PublicKey,
    nftOwner: PublicKey,
    guard: string,
    label: string,
  ) {
    if (label === AUTHORITY_GROUP_LABEL) return;
    const transaction = await constructThawTransaction(
      this.metaplex,
      candyMachineAddress,
      nftMint,
      nftOwner,
      guard,
      label,
    );
    return await sendAndConfirmTransaction(
      this.metaplex.connection,
      transaction,
      [this.metaplex.identity()],
    );
  }

  async unlockFunds(
    candyMachineAddress: PublicKey,
    guard: string,
    group: string,
  ) {
    const candyMachine = await this.metaplex
      .candyMachines()
      .findByAddress({ address: candyMachineAddress });
    await this.metaplex.candyMachines().callGuardRoute({
      candyMachine,
      guard,
      group,
      settings: {
        path: 'unlockFunds',
        candyGuardAuthority: this.metaplex.identity(),
      },
    });
  }

  async find(query: CandyMachineParams) {
    const address = query.candyMachineAddress;
    const candyMachine = await this.prisma.candyMachine.findUnique({
      where: { address },
      include: { groups: true },
    });
    if (!candyMachine) {
      throw new NotFoundException(
        `Candy Machine with address ${address} does not exist`,
      );
    }

    const groups: CandyMachineGroupSettings[] = await Promise.all(
      candyMachine.groups.map(
        async (group): Promise<CandyMachineGroupSettings> => {
          const { itemsMinted, displayLabel, isEligible, walletItemsMinted } =
            await this.getMintCount(
              query.candyMachineAddress,
              group.label,
              query.walletAddress,
              group.mintLimit,
            );
          let supply: number;
          if (group.label === PUBLIC_GROUP_LABEL) {
            supply = candyMachine.itemsRemaining + itemsMinted;
          } else {
            supply = group.supply;
          }
          return {
            ...group,
            supply,
            itemsMinted,
            displayLabel,
            walletStats: {
              isEligible,
              itemsMinted: walletItemsMinted,
            },
          };
        },
      ),
    );
    return { ...candyMachine, groups };
  }

  async findReceipts(query: CandyMachineReceiptParams) {
    const receipts = await this.prisma.candyMachineReceipt.findMany({
      where: { candyMachineAddress: query.candyMachineAddress },
      include: { nft: true, buyer: { include: { user: true } } },
      orderBy: { timestamp: 'desc' },
      skip: query.skip,
      take: query.take,
    });

    return receipts;
  }

  async addCandyMachineGroup(candyMachineAddress: string, params: GuardParams) {
    const {
      displayLabel,
      label,
      startDate,
      endDate,
      splTokenAddress,
      mintPrice,
      mintLimit,
      supply,
    } = params;
    await this.prisma.candyMachineGroup.create({
      data: {
        candyMachine: {
          connect: {
            address: candyMachineAddress,
          },
        },
        displayLabel,
        wallets: undefined,
        label,
        startDate,
        endDate,
        splTokenAddress,
        mintPrice,
        mintLimit,
        supply,
      },
    });
  }

  async findActiveRewardCandyMachine(label: string) {
    const candyMachines = await this.prisma.candyMachineGroup.findMany({
      where: {
        label,
        candyMachine: { itemsRemaining: { gt: 0 } },
      },
    });
    return candyMachines;
  }

  async addAllowList(
    candyMachineAddress: string,
    allowList: string[],
    label: string,
  ) {
    const wallets: Prisma.WalletCandyMachineGroupCreateNestedManyWithoutCandyMachineGroupInput =
      {
        create: allowList.map((address) => {
          return {
            wallet: {
              connectOrCreate: {
                where: { address },
                create: { address },
              },
            },
          };
        }),
      };
    const candyMachinePublicKey = new PublicKey(candyMachineAddress);
    const candyMachine = await metaplex
      .candyMachines()
      .findByAddress({ address: candyMachinePublicKey });
    const allowlist = await this.prisma.candyMachineGroup
      .update({
        where: {
          label_candyMachineAddress: { label, candyMachineAddress },
        },
        data: { wallets },
        include: { wallets: true },
      })
      .then((values) => values.wallets.map((wallet) => wallet.walletAddress));

    const allowListGuard: AllowListGuardSettings =
      allowlist.length > 0
        ? {
            merkleRoot: getMerkleRoot(allowlist),
          }
        : null;

    const existingGroup = candyMachine.candyGuard.groups.find(
      (group) => group.label === label,
    );
    const group: GuardGroup = {
      label,
      guards: { ...existingGroup.guards, allowList: allowListGuard },
    };
    const resolvedGroups = candyMachine.candyGuard.groups.filter(
      (group) => group.label != label,
    );
    const groups = [...resolvedGroups, group];
    await this.updateCandyMachine(candyMachinePublicKey, groups);
  }

  async findCandyMachineData(candyMachineAddress: string, label: string) {
    try {
      const data = await this.prisma.candyMachineGroup.findFirst({
        where: { candyMachineAddress, label },
        include: { wallets: true, candyMachine: true },
      });
      return {
        allowList:
          data.wallets && data.wallets.length
            ? data.wallets.map((item) => item.walletAddress)
            : undefined,
        lookupTable: data.candyMachine.lookupTable,
      };
    } catch (e) {
      console.error(e);
    }
  }

  async getMintCount(
    candyMachineAddress: string,
    label: string,
    walletAddress?: string,
    mintLimit?: number,
  ): Promise<{
    itemsMinted: number;
    displayLabel: string;
    isEligible: boolean;
    walletItemsMinted?: number;
  }> {
    const receipts = await this.prisma.candyMachineReceipt.findMany({
      where: { candyMachineAddress, label },
    });

    let receiptsFromBuyer: Prisma.CandyMachineReceiptCreateManyCandyMachineInput[];
    if (walletAddress) {
      receiptsFromBuyer = receipts.filter(
        (receipt) => receipt.buyerAddress === walletAddress,
      );
    }
    let displayLabel = PUBLIC_GROUP_LABEL;
    let isEligible = !!walletAddress;

    if (label !== PUBLIC_GROUP_LABEL) {
      const group = await this.prisma.candyMachineGroup.findFirst({
        where: { candyMachineAddress, label },
        include: { wallets: true },
      });

      displayLabel = group.displayLabel;
      if (walletAddress) {
        isEligible =
          !!group.wallets.find(
            (groupWallet) => groupWallet.walletAddress == walletAddress,
          ) && receiptsFromBuyer.length < mintLimit;
      }
    }

    return {
      itemsMinted: receipts.length,
      walletItemsMinted: receiptsFromBuyer?.length,
      displayLabel,
      isEligible,
    };
  }
}
