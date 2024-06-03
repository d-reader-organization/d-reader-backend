import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { PrismaService } from 'nestjs-prisma';
import {
  Metaplex,
  toBigNumber,
  DefaultCandyGuardSettings,
  CandyMachine as LegacyCandyMachine,
  getMerkleRoot,
  toDateTime,
  WRAPPED_SOL_MINT,
  AllowListGuardSettings,
  RedeemedAmountGuardSettings,
  StartDateGuardSettings,
  EndDateGuardSettings,
  MintLimitGuardSettings,
  MetaplexFile,
} from '@metaplex-foundation/js';
import { s3toMxFile } from '../utils/files';
import {
  constructCoreMintTransaction,
  constructMintOneTransaction,
} from './instructions';
import { HeliusService } from '../webhooks/helius/helius.service';
import { CandyMachineReceiptParams } from './dto/candy-machine-receipt-params.dto';
import {
  D_PUBLISHER_SYMBOL,
  HUNDRED,
  D_READER_FRONTEND_URL,
  FREEZE_NFT_DAYS,
  DAY_SECONDS,
  AUTHORITY_GROUP_LABEL,
  PUBLIC_GROUP_LABEL,
  FUNDS_DESTINATION_ADDRESS,
  MIN_COMPUTE_PRICE_IX,
  MIN_COMPUTE_PRICE,
} from '../constants';
import {
  findCandyMachineDiscount,
  isUserWhitelisted,
  isWalletWhiteListed,
  sleep,
  solFromLamports,
} from '../utils/helpers';
import {
  MetdataFile,
  getThirdPartySigner,
  metaplex,
  umi,
  writeFiles,
} from '../utils/metaplex';
import {
  findDefaultCover,
  getStatefulCoverName,
  validateComicIssueCMInput,
} from '../utils/comic-issue';
import { ComicIssueCMInput } from '../comic-issue/dto/types';
import { LegacyGuardGroup, RarityCoverFiles } from '../types/shared';
import {
  generatePropertyName,
  insertItems,
  JsonMetadataCreators,
  validateBalanceForMint,
} from '../utils/candy-machine';
import { DarkblockService } from './darkblock.service';
import { CandyMachineParams } from './dto/candy-machine-params.dto';
import {
  TokenStandard,
  ComicRarity as PrismaComicRarity,
  WhiteListType,
} from '@prisma/client';
import {
  CandyMachineGroupSettings,
  GroupWithWhiteListDetails,
  GuardParams,
} from './dto/types';
import { ComicRarity } from 'dreader-comic-verse';
import {
  createCoreCandyMachine,
  createLegacyCandyMachine,
} from './instructions/initialize-candy-machine';
import { constructThawTransaction } from './instructions/route';
import {
  constructCoreCollectionTransaction,
  createCollectionNft,
} from './instructions/create-collection';
import {
  Umi,
  generateSigner,
  publicKey,
  PublicKey as UmiPublicKey,
  transactionBuilder,
  some,
  lamports as umiLamports,
  dateTime as umiDateTime,
  none,
  createBigInt,
  Option,
} from '@metaplex-foundation/umi';
import {
  fetchCandyMachine,
  findCandyMachineAuthorityPda,
  CandyMachine as CoreCandyMachine,
  updateCandyGuard,
  DefaultGuardSetArgs,
  fetchCandyGuard,
  getMerkleRoot as getCoreMekleRoot,
  DefaultGuardSet,
  RedeemedAmount,
  StartDate,
  EndDate,
  GuardGroup as CoreGuardGroup,
  AllowList,
  ThirdPartySigner,
  TokenPayment,
  SolPayment,
} from '@metaplex-foundation/mpl-core-candy-machine';
import { insertCoreItems } from '../utils/core-candy-machine';
import {
  findAssociatedTokenPda,
  setComputeUnitPrice,
} from '@metaplex-foundation/mpl-toolbox';
import { base58 } from '@metaplex-foundation/umi/serializers';
import {
  deleteCoreCandyMachine,
  deleteLegacyCandyMachine,
} from './instructions/delete-candy-machine';
import { NonceService } from '../nonce/nonce.service';
import { getTransactionWithPriorityFee } from 'src/utils/das';

@Injectable()
export class CandyMachineService {
  private readonly metaplex: Metaplex;
  private readonly umi: Umi;

  constructor(
    private readonly prisma: PrismaService,
    private readonly heliusService: HeliusService,
    private readonly darkblockService: DarkblockService,
    private readonly nonceService: NonceService,
  ) {
    this.metaplex = metaplex;
    this.umi = umi;
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
    candyMachine: LegacyCandyMachine<DefaultCandyGuardSettings>,
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

  async getOrCreateComicIssueCollection(
    comicIssue: ComicIssueCMInput,
    onChainName: string,
    royaltyWallets: JsonMetadataCreators,
    statelessCovers: MetaplexFile[],
    statefulCovers: MetaplexFile[],
    tokenStandard?: TokenStandard,
  ) {
    const {
      pdf,
      id: comicIssueId,
      description,
      creatorAddress,
      title,
      sellerFeeBasisPoints,
    } = comicIssue;

    const cover = findDefaultCover(comicIssue.statelessCovers);
    const coverImage = await s3toMxFile(cover.image);
    // if Collection NFT already exists - use it, otherwise create a fresh one
    let collectionAddress: PublicKey;
    const collectionAsset = await this.prisma.collection.findUnique({
      where: {
        comicIssueId,
        candyMachines: { some: { standard: tokenStandard } },
      },
    });

    let darkblockId = '';
    // Core standard doesn't allow same collection to be expanded in supply as of now so candymachine create will fail if used old collection
    if (collectionAsset && tokenStandard !== TokenStandard.Core) {
      collectionAddress = new PublicKey(collectionAsset.address);
      darkblockId = collectionAsset.darkblockId ?? '';
    } else {
      let darkblockMetadataFile: MetdataFile;
      if (pdf) {
        darkblockId = await this.darkblockService.mintDarkblock(
          pdf,
          description,
          creatorAddress,
        );
        darkblockMetadataFile = {
          type: 'Darkblock',
          uri: darkblockId,
        };
      }

      const { uri: collectionAssetUri } = await this.metaplex
        .nfts()
        .uploadMetadata({
          name: title,
          symbol: D_PUBLISHER_SYMBOL,
          description: description,
          seller_fee_basis_points: sellerFeeBasisPoints,
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
              ...(darkblockMetadataFile ? [darkblockMetadataFile] : []),
            ],
          },
        });

      if (tokenStandard === TokenStandard.Core) {
        const collection = generateSigner(umi);
        const creators = royaltyWallets.map((item) => {
          return {
            address: publicKey(item.address),
            percentage: item.share,
          };
        });

        const nonceArgs = await this.nonceService.getNonce();
        await constructCoreCollectionTransaction(
          this.umi,
          collection,
          collectionAssetUri,
          onChainName,
          sellerFeeBasisPoints,
          creators,
          nonceArgs,
        );
        console.log(`Collection: ${collection.publicKey.toString()}`);

        if (nonceArgs) {
          await this.nonceService.updateNonce(new PublicKey(nonceArgs.address));
        }
        collectionAddress = new PublicKey(collection.publicKey);
      } else {
        const newCollectionNft = await createCollectionNft(
          this.metaplex,
          onChainName,
          collectionAssetUri,
          sellerFeeBasisPoints,
        );
        collectionAddress = newCollectionNft.address;
      }

      await this.prisma.collection.create({
        data: {
          address: collectionAddress.toBase58(),
          name: onChainName,
          comicIssue: { connect: { id: comicIssue.id } },
        },
      });
    }
    return { collectionAddress, darkblockId };
  }

  async createComicIssueCM({
    comicIssue,
    comicName,
    onChainName,
    guardParams,
    tokenStandard,
  }: {
    comicIssue: ComicIssueCMInput;
    comicName: string;
    onChainName: string;
    guardParams: GuardParams;
    tokenStandard?: TokenStandard;
  }) {
    validateComicIssueCMInput(comicIssue);
    const royaltyWallets: JsonMetadataCreators = comicIssue.royaltyWallets;

    const { statefulCovers, statelessCovers, rarityCoverFiles } =
      await this.getComicIssueCovers(comicIssue);

    const { collectionAddress, darkblockId } =
      await this.getOrCreateComicIssueCollection(
        comicIssue,
        onChainName,
        royaltyWallets,
        statelessCovers,
        statefulCovers,
        tokenStandard,
      );

    const {
      startDate,
      endDate,
      mintLimit,
      freezePeriod,
      mintPrice,
      supply,
      whiteListType,
      splTokenAddress,
    } = guardParams;

    let candyMachine: LegacyCandyMachine | CoreCandyMachine;
    let candyMachineAddress: string;
    const shouldBePublic = whiteListType === WhiteListType.Public;

    if (tokenStandard === TokenStandard.Core) {
      console.log('Create Core Candy Machine');
      const nonceArgs = await this.nonceService.getNonce();
      const [candyMachinePubkey, lut] = await createCoreCandyMachine(
        this.umi,
        publicKey(collectionAddress),
        guardParams,
        !!shouldBePublic,
        nonceArgs,
      );

      if (nonceArgs) {
        await this.nonceService.updateNonce(new PublicKey(nonceArgs.address));
      }

      const candyMachine = await fetchCandyMachine(umi, candyMachinePubkey, {
        commitment: 'confirmed',
      });
      await this.prisma.candyMachine.create({
        data: {
          address: candyMachine.publicKey.toString(),
          mintAuthorityAddress: candyMachine.mintAuthority.toString(),
          collectionAddress: candyMachine.collectionMint.toString(),
          authorityPda: findCandyMachineAuthorityPda(umi, {
            candyMachine: candyMachine.publicKey,
          }).toString(),
          itemsAvailable: Number(candyMachine.data.itemsAvailable),
          itemsMinted: Number(candyMachine.itemsRedeemed),
          itemsRemaining: Number(candyMachine.data.itemsAvailable),
          itemsLoaded: candyMachine.itemsLoaded,
          isFullyLoaded: true,
          supply,
          standard: TokenStandard.Core,
          lookupTable: lut ? lut.toString() : undefined,
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
                  splTokenAddress,
                  whiteListType,
                },
              }
            : undefined,
        },
      });

      try {
        const itemMetadatas = await insertCoreItems(
          this.umi,
          this.metaplex,
          candyMachine.publicKey,
          comicIssue,
          publicKey(collectionAddress),
          comicName,
          royaltyWallets,
          statelessCovers,
          darkblockId,
          supply,
          onChainName,
          rarityCoverFiles,
        );

        const metadataCreateData = itemMetadatas.map((item) => {
          return {
            uri: item.metadata.uri,
            isUsed: item.isUsed,
            isSigned: item.isSigned,
            rarity: PrismaComicRarity[ComicRarity[item.rarity].toString()],
            collectionName: onChainName,
            collectionAddress: collectionAddress.toString(),
          };
        });

        await this.prisma.metadata.createMany({
          data: metadataCreateData,
          skipDuplicates: true,
        });
        const updatedCandyMachine = await fetchCandyMachine(
          umi,
          candyMachinePubkey,
          { commitment: 'confirmed' },
        );

        await this.prisma.candyMachine.update({
          where: { address: candyMachine.publicKey.toString() },
          data: { itemsLoaded: updatedCandyMachine.itemsLoaded },
        });
      } catch (e) {
        console.error(`Failed to insert items: `, e);
      }

      candyMachineAddress = candyMachine.publicKey.toString();
    } else {
      console.log('Create Legacy Candy Machine');

      const [candyMachinePubkey, lut] = await createLegacyCandyMachine(
        this.metaplex,
        collectionAddress,
        comicIssue,
        royaltyWallets,
        guardParams,
        !!shouldBePublic,
      );

      let candyMachine = await this.metaplex
        .candyMachines()
        .findByAddress({ address: candyMachinePubkey });

      if (freezePeriod) {
        await sleep(1000);
        await this.initializeGuardAccounts(candyMachine, freezePeriod);
      }

      const authorityPda = this.metaplex
        .candyMachines()
        .pdas()
        .authority({ candyMachine: candyMachine.address })
        .toString();

      try {
        const itemMetadatas = await insertItems(
          this.metaplex,
          candyMachine,
          comicIssue,
          collectionAddress,
          comicName,
          royaltyWallets,
          statelessCovers,
          darkblockId,
          supply,
          onChainName,
          rarityCoverFiles,
        );
        const metadataCreateData = itemMetadatas.map((item) => {
          return {
            uri: item.metadata.uri,
            isUsed: item.isUsed,
            isSigned: item.isSigned,
            rarity: PrismaComicRarity[ComicRarity[item.rarity].toString()],
            collectionName: onChainName,
            collectionAddress: collectionAddress.toString(),
          };
        });

        await this.prisma.metadata.createMany({
          data: metadataCreateData,
          skipDuplicates: true,
        });
        await sleep(1000); // wait for data to update before refetching candymachine.
      } catch (e) {
        console.error(e);
      }

      candyMachine = await this.metaplex.candyMachines().refresh(candyMachine);
      await this.prisma.candyMachine.create({
        data: {
          address: candyMachine.address.toBase58(),
          mintAuthorityAddress: candyMachine.mintAuthorityAddress.toBase58(),
          collectionAddress: candyMachine.collectionMintAddress.toBase58(),
          authorityPda,
          itemsAvailable: candyMachine.itemsAvailable.toNumber(),
          itemsMinted: candyMachine.itemsMinted.toNumber(),
          itemsRemaining: candyMachine.itemsRemaining.toNumber(),
          itemsLoaded: candyMachine.itemsLoaded,
          isFullyLoaded: candyMachine.isFullyLoaded,
          supply,
          lookupTable: lut.toString(),
          standard: tokenStandard,
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
                  whiteListType: WhiteListType.Public,
                },
              }
            : undefined,
        },
      });
      candyMachineAddress = candyMachine.address.toBase58();
    }

    this.heliusService.subscribeTo(candyMachineAddress);
    return candyMachine;
  }

  async updateCoreCandyMachine(
    candMachineAddress: UmiPublicKey,
    groups: CoreGuardGroup<DefaultGuardSet>[],
    guards: Partial<DefaultGuardSetArgs>,
  ) {
    try {
      const candyMachine = await fetchCandyMachine(
        this.umi,
        candMachineAddress,
      );
      const updateBuilder = updateCandyGuard(this.umi, {
        groups,
        guards,
        candyGuard: candyMachine.mintAuthority,
      });
      const builder = transactionBuilder()
        .add(
          setComputeUnitPrice(this.umi, { microLamports: MIN_COMPUTE_PRICE }),
        )
        .add(updateBuilder);
      const response = await builder.sendAndConfirm(this.umi, {
        send: { commitment: 'confirmed', skipPreflight: true },
      });
      const signature = base58.deserialize(response.signature);
      console.log(`CandyMachine updated : ${signature}`);
    } catch (e) {
      console.error(
        `Error updating CandyMachine ${candMachineAddress.toString()}`,
        e,
      );
    }
  }

  async updateCandyMachine(
    candyMachineAddress: PublicKey,
    groups?: LegacyGuardGroup[],
    guards?: Partial<DefaultCandyGuardSettings>,
  ) {
    const candyMachine = await this.metaplex
      .candyMachines()
      .findByAddress({ address: candyMachineAddress });
    const builder = this.metaplex.candyMachines().builders().update({
      candyMachine,
      groups,
      guards,
    });
    const latestBlockhash = await this.metaplex.connection.getLatestBlockhash({
      commitment: 'confirmed',
    });
    const transaction = new Transaction({
      feePayer: this.metaplex.identity().publicKey,
      ...latestBlockhash,
    }).add(MIN_COMPUTE_PRICE_IX, builder.toTransaction(latestBlockhash));

    const signature = await sendAndConfirmTransaction(
      this.metaplex.connection,
      transaction,
      [this.metaplex.identity()],
      { commitment: 'confirmed', skipPreflight: true },
    );
    console.log(`CandyMachine updated : ${signature}`);
  }

  async createMintTransaction(
    feePayer: PublicKey,
    candyMachineAddress: PublicKey,
    label: string,
    mintCount?: number,
    userId?: number,
  ) {
    const transactions: Promise<string[]>[] = [];
    for (let i = 0; i < mintCount; i++) {
      transactions.push(
        this.createMintOneTransaction(
          feePayer,
          candyMachineAddress,
          label,
          userId,
        ),
      );
    }
    return await Promise.all(transactions);
  }

  // TODO: Make it support checks for multiple mints
  async createMintOneTransaction(
    feePayer: PublicKey,
    candyMachineAddress: PublicKey,
    label: string,
    userId?: number,
  ) {
    const {
      walletWhiteList,
      lookupTable,
      mintPrice,
      tokenStandard,
      userWhiteList,
      whiteListType,
      mintLimit,
    } = await this.findCandyMachineData(candyMachineAddress.toString(), label);

    const balance = await this.metaplex.connection.getBalance(feePayer);
    validateBalanceForMint(mintPrice, balance, tokenStandard);

    if (tokenStandard === TokenStandard.Core) {
      const isPublicMint =
        whiteListType === WhiteListType.Public ||
        whiteListType === WhiteListType.WalletWhiteList;

      if (!isPublicMint) {
        if (!userId) {
          throw new UnauthorizedException(
            "Mint is limited to dReader users, make sure you're signed in!",
          );
        }

        if (whiteListType === WhiteListType.UserWhiteList) {
          const isWhitelisted = isUserWhitelisted(userId, userWhiteList);
          if (!isWhitelisted) {
            throw new UnauthorizedException(
              'User is not eligible for this mint !',
            );
          }
        }
      }

      if (mintLimit) {
        const itemsMinted = isPublicMint
          ? await this.countWalletItemsMintedQuery(
              candyMachineAddress.toString(),
              feePayer.toString(),
            )
          : await this.countUserItemsMintedQuery(
              candyMachineAddress.toString(),
              userId,
            );

        if (itemsMinted >= mintLimit) {
          throw new UnauthorizedException('Mint limit reached !');
        }
      }

      const CORE_MINT_COMPUTE_BUDGET = 800000;
      return await getTransactionWithPriorityFee(
        constructCoreMintTransaction,
        CORE_MINT_COMPUTE_BUDGET,
        umi,
        publicKey(candyMachineAddress),
        publicKey(feePayer),
        label,
        walletWhiteList,
        lookupTable,
        true,
      );
    }

    return await constructMintOneTransaction(
      this.metaplex,
      feePayer,
      candyMachineAddress,
      label,
      walletWhiteList,
      lookupTable,
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
    try {
      const transaction = await constructThawTransaction(
        this.metaplex,
        candyMachineAddress,
        nftMint,
        nftOwner,
        guard,
        label,
      );
      console.log(`Thaw in process : ${nftMint.toString()}`);
      return await sendAndConfirmTransaction(
        this.metaplex.connection,
        transaction,
        [this.metaplex.identity()],
      );
    } catch (e) {
      console.log(`${nftMint} failed to thawed`);
      console.error(e);
    }
  }

  async unlockFunds(
    candyMachineAddress: PublicKey,
    guard: string,
    group: string,
  ) {
    try {
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
      console.log(`Funds unlocked: ${group}`);
    } catch (e) {
      console.error(e);
    }
  }

  async find(query: CandyMachineParams, userId?: number) {
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
          const {
            displayLabel,
            isEligible,
            walletItemsMinted,
            userItemsMinted,
          } = await this.getMintDetails(
            query.candyMachineAddress,
            group.label,
            query.walletAddress,
            userId,
          );
          return {
            ...group,
            mintPrice: Number(group.mintPrice),
            itemsMinted: candyMachine.itemsMinted,
            displayLabel,
            walletStats: {
              isEligible,
              itemsMinted: walletItemsMinted,
            },
            userStats: {
              isEligible,
              itemsMinted: userItemsMinted,
            },
          };
        },
      ),
    );

    const discount = findCandyMachineDiscount(groups);
    let filteredGroups: CandyMachineGroupSettings[];

    // Note: Outlaw still ongoing and has deprecated configuration, for supporting new ux only active public group is returned
    const OUTLAW_CANDY_MACHINE = '6bGL4SqFvsTJ2Wg6bfbFtwKgZwTrNPLiPoYzWMM8AFV3';
    if (candyMachine.address === OUTLAW_CANDY_MACHINE) {
      filteredGroups = groups.filter((group) => group.label === 'public');
    } else if (userId) {
      filteredGroups = groups.filter(
        (group) =>
          group.whiteListType == WhiteListType.User ||
          group.whiteListType == WhiteListType.UserWhiteList,
      );
    } else {
      filteredGroups = groups.filter(
        (group) =>
          group.whiteListType == WhiteListType.Public ||
          group.whiteListType == WhiteListType.WalletWhiteList,
      );
    }

    if (filteredGroups.length == 0) {
      filteredGroups = groups;
    }

    return { ...candyMachine, discount, groups: filteredGroups };
  }

  async findReceipts(query: CandyMachineReceiptParams) {
    const receipts = await this.prisma.candyMachineReceipt.findMany({
      where: { candyMachineAddress: query.candyMachineAddress },
      include: { asset: true, buyer: { include: { user: true } } },
      orderBy: { timestamp: 'desc' },
      skip: query.skip,
      take: query.take,
    });

    return receipts;
  }

  async addLegacyCandyMachineGroupOnChain(
    candyMachineAddress: string,
    params: GuardParams,
  ) {
    const { label, startDate, endDate, mintPrice, mintLimit, supply, frozen } =
      params;
    const candyMachinePublicKey = new PublicKey(candyMachineAddress);
    const candyMachine = await this.metaplex
      .candyMachines()
      .findByAddress({ address: candyMachinePublicKey });
    const candyMachineGroups = candyMachine.candyGuard.groups;

    const redeemedAmountGuard: RedeemedAmountGuardSettings = {
      maximum: toBigNumber(supply),
    };
    let startDateGuard: StartDateGuardSettings;
    if (startDate) startDateGuard = { date: toDateTime(startDate) };

    let endDateGuard: EndDateGuardSettings;
    if (endDate) endDateGuard = { date: toDateTime(endDate) };

    let mintLimitGuard: MintLimitGuardSettings;
    if (mintLimit)
      mintLimitGuard = { id: candyMachineGroups.length, limit: mintLimit };

    const paymentGuard = frozen ? 'freezeSolPayment' : 'solPayment';
    const existingGroup = candyMachineGroups.find(
      (group) => group.label === label,
    );

    if (existingGroup) {
      throw new Error(`A group with label ${label} already exists`);
    }

    const group: LegacyGuardGroup = {
      label,
      guards: {
        ...candyMachine.candyGuard.guards,
        [paymentGuard]: {
          amount: solFromLamports(mintPrice),
          destination: FUNDS_DESTINATION_ADDRESS,
        },
        redeemedAmount: redeemedAmountGuard,
        startDate: startDateGuard,
        endDate: endDateGuard,
        mintLimit: mintLimitGuard,
      },
    };
    const resolvedGroups = candyMachineGroups.filter(
      (group) => group.label != label,
    );

    const groups = [...resolvedGroups, group];
    await this.updateCandyMachine(candyMachinePublicKey, groups);
  }

  async addCoreCandyMachineGroupOnChain(
    candyMachineAddress: string,
    params: GuardParams,
  ) {
    const {
      label,
      startDate,
      endDate,
      mintPrice,
      // mintLimit,
      supply,
      frozen,
      splTokenAddress,
    } = params;

    const candyMachine = await fetchCandyMachine(
      this.umi,
      publicKey(candyMachineAddress),
    );
    const candyGuard = await fetchCandyGuard(
      this.umi,
      candyMachine.mintAuthority,
    );

    const candyMachineGroups = candyGuard.groups;
    const redeemedAmountGuard: RedeemedAmount = {
      maximum: createBigInt(supply),
    };
    let startDateGuard: StartDate;
    if (startDate) startDateGuard = { date: umiDateTime(startDate) };

    let endDateGuard: EndDate;
    if (endDate) endDateGuard = { date: umiDateTime(endDate) };

    // Mint limit is centralized using third party signer
    // let mintLimitGuard: MintLimit;
    // if (mintLimit)
    //   mintLimitGuard = { id: candyMachineGroups.length, limit: mintLimit };

    const thirdPartySigner = getThirdPartySigner();
    const thirdPartySignerGuard: ThirdPartySigner = {
      signerKey: publicKey(thirdPartySigner),
    };

    let paymentGuardName: string;

    const isSolPayment = splTokenAddress === WRAPPED_SOL_MINT.toString();
    let paymentGuard: TokenPayment | SolPayment;

    if (isSolPayment) {
      paymentGuardName = frozen ? 'freezeSolPayment' : 'solPayment';
      paymentGuard = {
        lamports: umiLamports(mintPrice),
        destination: publicKey(FUNDS_DESTINATION_ADDRESS),
      };
    } else {
      paymentGuardName = frozen ? 'freezeTokenPayment' : 'tokenPayment';
      paymentGuard = {
        // Currently, this would be only USDC
        amount: BigInt(mintPrice),
        destinationAta: findAssociatedTokenPda(this.umi, {
          mint: publicKey(splTokenAddress),
          owner: publicKey(FUNDS_DESTINATION_ADDRESS),
        })[0],
        mint: publicKey(splTokenAddress),
      };
    }

    const existingGroup = candyMachineGroups.find(
      (group) => group.label === label,
    );

    if (existingGroup) {
      throw new Error(`A group with label ${label} already exists`);
    }

    const group: CoreGuardGroup<DefaultGuardSet> = {
      label,
      guards: {
        ...candyGuard.guards,
        [paymentGuardName]: some(paymentGuard),
        redeemedAmount: some(redeemedAmountGuard),
        startDate: startDate ? some(startDateGuard) : none(),
        endDate: endDate ? some(endDateGuard) : none(),
        // mintLimit: mintLimitGuard ? some(mintLimitGuard) : none(),
        thirdPartySigner: some(thirdPartySignerGuard),
      },
    };
    const resolvedGroups = candyMachineGroups.filter(
      (group) => group.label != label,
    );
    resolvedGroups.push(group);
    await this.updateCoreCandyMachine(
      publicKey(candyMachineAddress),
      resolvedGroups,
      candyGuard.guards,
    );
  }

  async addUsersToWhiteList(
    candyMachineAddress: string,
    label: string,
    usernames: string[],
  ) {
    const users = await this.prisma.user.findMany({
      where: {
        name: { in: usernames },
        userCandyMachineGroup: {
          none: { candyMachineGroup: { label, candyMachineAddress } },
        },
      },
    });

    await this.prisma.candyMachineGroup.update({
      where: { label_candyMachineAddress: { label, candyMachineAddress } },
      data: {
        users: {
          create: users.map((user) => {
            return {
              user: {
                connect: { id: user.id },
              },
            };
          }),
        },
      },
    });
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
      whiteListType,
    } = params;
    const isSupportedToken = await this.prisma.splToken.findFirst({
      where: { address: splTokenAddress },
    });
    if (!isSupportedToken) {
      throw new BadRequestException('Spl token is not supported');
    }

    const candyMachine = await this.prisma.candyMachine.findUnique({
      where: { address: candyMachineAddress },
    });
    if (candyMachine.standard == TokenStandard.Legacy) {
      await this.addLegacyCandyMachineGroupOnChain(candyMachineAddress, params);
    } else {
      await this.addCoreCandyMachineGroupOnChain(candyMachineAddress, params);
    }

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
        whiteListType,
      },
    });
  }

  async addAllowList(
    candyMachineAddress: string,
    allowList: string[],
    label: string,
  ) {
    console.log('finding the already allowlist in db');
    const alreadyAllowlistedWallets = await this.prisma.wallet.findMany({
      where: {
        candyMachineGroups: {
          some: { candyMachineGroup: { label, candyMachineAddress } },
        },
      },
    });

    const allowlistedWallets = alreadyAllowlistedWallets.map((w) => w.address);
    const filteredAllowlist = allowList.filter(
      (address) => !allowlistedWallets.includes(address),
    );

    console.log('Adding allowlist in database');
    const wallets = await this.prisma.candyMachineGroup
      .update({
        where: { label_candyMachineAddress: { label, candyMachineAddress } },
        data: {
          wallets: {
            create: filteredAllowlist.map((address) => ({
              wallet: {
                connectOrCreate: {
                  where: { address },
                  create: { address },
                },
              },
            })),
          },
        },
        include: { wallets: true },
      })
      .then((values) => values.wallets.map((wallet) => wallet.walletAddress));

    const candyMachineData = await this.prisma.candyMachine.findFirst({
      where: { address: candyMachineAddress },
    });

    if (candyMachineData.standard === TokenStandard.Core) {
      const candyGuard = await fetchCandyGuard(
        this.umi,
        publicKey(candyMachineData.mintAuthorityAddress),
      );
      const allowListGuard: Option<AllowList> =
        wallets.length > 0
          ? some({
              merkleRoot: getCoreMekleRoot(wallets),
            })
          : none();
      const existingGroup = candyGuard.groups.find(
        (group) => group.label === label,
      );
      const group: CoreGuardGroup<DefaultGuardSet> = {
        label,
        guards: {
          ...existingGroup.guards,
          allowList: allowListGuard,
        },
      };
      const resolvedGroups = candyGuard.groups.filter(
        (group) => group.label != label,
      );
      const groups = [...resolvedGroups, group];
      console.log('Updating the candymachine with allowlist');
      await this.updateCoreCandyMachine(
        publicKey(candyMachineAddress),
        groups,
        candyGuard.guards,
      );
    } else {
      const candyMachinePublicKey = new PublicKey(candyMachineAddress);
      const candyMachine = await metaplex
        .candyMachines()
        .findByAddress({ address: candyMachinePublicKey });

      const allowListGuard: AllowListGuardSettings =
        wallets.length > 0 ? { merkleRoot: getMerkleRoot(wallets) } : null;

      const existingGroup = candyMachine.candyGuard.groups.find(
        (group) => group.label === label,
      );

      const group: LegacyGuardGroup = {
        label,
        guards: { ...existingGroup.guards, allowList: allowListGuard },
      };

      const resolvedGroups = candyMachine.candyGuard.groups.filter(
        (group) => group.label != label,
      );

      const groups = [...resolvedGroups, group];
      console.log('Updating the candymachine with allowlist');
      await this.updateCandyMachine(candyMachinePublicKey, groups);
    }
  }

  async findCandyMachineData(candyMachineAddress: string, label: string) {
    try {
      const data = await this.prisma.candyMachineGroup.findFirst({
        where: { candyMachineAddress, label },
        include: { wallets: true, candyMachine: true, users: true },
      });
      if (!data) {
        throw new NotFoundException();
      }
      return {
        walletWhiteList:
          data.wallets && data.wallets.length
            ? data.wallets.map((item) => item.walletAddress)
            : undefined,
        userWhiteList: data.users && data.users.length ? data.users : [],
        lookupTable: data.candyMachine.lookupTable,
        mintPrice: Number(data.mintPrice),
        tokenStandard: data.candyMachine.standard,
        whiteListType: data.whiteListType,
        mintLimit: data.mintLimit,
      };
    } catch (e) {
      console.error(e);
    }
  }

  async getMintDetails(
    candyMachineAddress: string,
    label: string,
    walletAddress?: string,
    userId?: number,
  ): Promise<{
    displayLabel: string;
    isEligible: boolean;
    walletItemsMinted?: number;
    userItemsMinted?: number;
  }> {
    const group = await this.prisma.candyMachineGroup.findFirst({
      where: { candyMachineAddress, label },
      include: { wallets: true, users: true },
    });

    // Check if wallet address is provided
    if (!walletAddress) {
      return { isEligible: false, displayLabel: group.displayLabel };
    }

    // Check if user ID is missing for user-specific whitelist types
    if (
      !userId &&
      (group.whiteListType === WhiteListType.User ||
        group.whiteListType === WhiteListType.UserWhiteList)
    ) {
      return { isEligible: false, displayLabel: group.displayLabel };
    }

    switch (group.whiteListType) {
      case WhiteListType.Public:
        return this.checkWhiteListTypePublic(group, walletAddress);
      case WhiteListType.User:
        return this.checkWhiteListTypeUser(group, userId);
      case WhiteListType.UserWhiteList:
        return this.checkWhiteListTypeUserWhiteList(group, userId);
      case WhiteListType.WalletWhiteList:
        return this.checkWhiteListTypeWalletWhiteList(group, walletAddress);
      default:
        return { isEligible: false, displayLabel: group.displayLabel };
    }
  }

  async deleteCandyMachine(address: PublicKey) {
    const { standard, mintAuthorityAddress } =
      await this.prisma.candyMachine.findUnique({
        where: { address: address.toString() },
      });
    if (standard === TokenStandard.Core) {
      return deleteCoreCandyMachine(
        this.umi,
        publicKey(address),
        publicKey(mintAuthorityAddress),
      );
    } else {
      return deleteLegacyCandyMachine(this.metaplex, address);
    }
  }

  countUserItemsMintedQuery = (candyMachineAddress: string, userId: number) => {
    return this.prisma.candyMachineReceipt.count({
      where: { candyMachineAddress, userId },
    });
  };

  // Wallet whitelist group should be public
  countWalletItemsMintedQuery = (
    candyMachineAddress: string,
    buyerAddress: string,
  ) => {
    // All public group labels starts with p
    return this.prisma.candyMachineReceipt.count({
      where: {
        candyMachineAddress,
        buyerAddress,
        label: { startsWith: 'p' },
      },
    });
  };

  async checkWhiteListTypeWalletWhiteList(
    group: GroupWithWhiteListDetails,
    walletAddress: string,
  ) {
    const walletItemsMinted = await this.countWalletItemsMintedQuery(
      group.candyMachineAddress,
      walletAddress,
    );
    const mintLimitReached = group.mintLimit
      ? group.mintLimit <= walletItemsMinted
      : false;

    const isEligible =
      isWalletWhiteListed(walletAddress, group.wallets) && !mintLimitReached;
    return {
      isEligible,
      walletItemsMinted,
      displayLabel: group.displayLabel,
    };
  }

  async checkWhiteListTypeUserWhiteList(
    group: GroupWithWhiteListDetails,
    userId: number,
  ) {
    const userItemsMinted = await this.countUserItemsMintedQuery(
      group.candyMachineAddress,
      userId,
    );

    const mintLimitReached = group.mintLimit
      ? group.mintLimit <= userItemsMinted
      : false;

    const isEligible =
      isUserWhitelisted(userId, group.users) && !mintLimitReached;
    return {
      isEligible,
      userItemsMinted,
      displayLabel: group.displayLabel,
    };
  }

  async checkWhiteListTypePublic(
    group: GroupWithWhiteListDetails,
    walletAddress: string,
  ) {
    const walletItemsMinted = await this.countWalletItemsMintedQuery(
      group.candyMachineAddress,
      walletAddress,
    );
    const isEligible = group.mintLimit
      ? group.mintLimit > walletItemsMinted
      : true;
    return {
      isEligible,
      walletItemsMinted,
      displayLabel: group.displayLabel,
    };
  }

  async checkWhiteListTypeUser(
    group: GroupWithWhiteListDetails,
    userId: number,
  ) {
    const userItemsMinted = await this.countUserItemsMintedQuery(
      group.candyMachineAddress,
      userId,
    );
    const isEligible = group.mintLimit
      ? group.mintLimit > userItemsMinted
      : true;

    return {
      isEligible,
      userItemsMinted,
      displayLabel: group.displayLabel,
    };
  }
}
