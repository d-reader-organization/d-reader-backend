import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PublicKey } from '@solana/web3.js';
import { PrismaService } from 'nestjs-prisma';
import {
  Metaplex,
  WRAPPED_SOL_MINT,
  MetaplexFile,
} from '@metaplex-foundation/js';
import { s3toMxFile } from '../utils/files';
import { constructCoreMintTransaction } from './instructions';
import { HeliusService } from '../webhooks/helius/helius.service';
import { CandyMachineReceiptParams } from './dto/candy-machine-receipt-params.dto';
import {
  D_PUBLISHER_SYMBOL,
  HUNDRED,
  D_READER_FRONTEND_URL,
  FUNDS_DESTINATION_ADDRESS,
  MIN_COMPUTE_PRICE,
} from '../constants';
import {
  findCandyMachineCouponDiscount,
  findUserInUserWhiteList,
  findWalletInWalletWhiteList,
  getCouponLabel,
} from '../utils/helpers';
import {
  MetadataFile,
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
import { RarityCoverFiles } from '../types/shared';
import { DarkblockService } from './darkblock.service';
import { CandyMachineParams } from './dto/candy-machine-params.dto';
import {
  TokenStandard,
  ComicRarity as PrismaComicRarity,
  CouponType,
} from '@prisma/client';
import {
  AddCandyMachineCouponConfigParams,
  CandyMachineCouponWithEligibleUsersAndWallets,
  CandyMachineCouponWithStats,
  CreateCandyMachineParams,
} from './dto/types';
import { ComicRarity } from 'dreader-comic-verse';
import { createCoreCandyMachine } from './instructions/initialize-candy-machine';
import { createCoreCollection } from './instructions/create-collection';
import {
  Umi,
  generateSigner,
  publicKey,
  PublicKey as UmiPublicKey,
  transactionBuilder,
  some,
  lamports as umiLamports,
  createBigInt,
} from '@metaplex-foundation/umi';
import {
  fetchCandyMachine,
  findCandyMachineAuthorityPda,
  updateCandyGuard,
  DefaultGuardSetArgs,
  fetchCandyGuard,
  DefaultGuardSet,
  RedeemedAmount,
  GuardGroup as CoreGuardGroup,
  ThirdPartySigner,
  TokenPayment,
  SolPayment,
} from '@metaplex-foundation/mpl-core-candy-machine';
import {
  insertCoreItems,
  generatePropertyName,
  validateBalanceForMint,
} from '../utils/candy-machine';
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
import { getTransactionWithPriorityFee } from '../utils/das';
import { RoyaltyWalletDto } from '../comic-issue/dto/royalty-wallet.dto';
import { AddCandyMachineCouponDto } from './dto/add-candy-machine-coupon.dto';
import { AddCandyMachineCouponPriceConfigDto } from './dto/add-coupon-price-config.dto';

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

  /* Create Candy Machine for Comic Issue */
  async createComicIssueCM({
    comicIssue,
    createCandyMachineParams,
  }: {
    comicIssue: ComicIssueCMInput;
    createCandyMachineParams: CreateCandyMachineParams;
  }) {
    validateComicIssueCMInput(comicIssue);
    const royaltyWallets = comicIssue.royaltyWallets;

    const { statefulCovers, statelessCovers, rarityCoverFiles } =
      await this.getComicIssueCovers(comicIssue);

    const { collectionAddress, darkblockId } =
      await this.getOrCreateComicIssueCollection(
        comicIssue,
        createCandyMachineParams.assetOnChainName,
        royaltyWallets,
        statelessCovers,
        statefulCovers,
      );

    const {
      startsAt,
      expiresAt,
      numberOfRedemptions,
      mintPrice,
      usdcEquivalentMintPrice,
      supply,
      couponType,
      splTokenAddress,
      assetOnChainName,
      comicName,
    } = createCandyMachineParams;

    const isPublicMint = couponType === CouponType.PublicUser;

    console.log('Create Core Candy Machine');
    const nonceArgs = await this.nonceService.getNonce();
    const [candyMachinePubkey, lut] = await createCoreCandyMachine(
      this.umi,
      publicKey(collectionAddress),
      createCandyMachineParams,
      isPublicMint,
      nonceArgs,
    );

    if (nonceArgs) {
      await this.nonceService.updateNonce(new PublicKey(nonceArgs.address));
    }

    const candyMachine = await fetchCandyMachine(umi, candyMachinePubkey, {
      commitment: 'confirmed',
    });
    const candyMachineAddress = candyMachine.publicKey.toString();

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
        coupons: isPublicMint
          ? {
              create: {
                name: 'Public Coupon',
                description: 'Public Coupon',
                supply,
                numberOfRedemptions,
                startsAt,
                expiresAt,
                type: CouponType.PublicUser,
                currencySettings: {
                  create: {
                    mintPrice,
                    splTokenAddress,
                    label: getCouponLabel(CouponType.PublicUser, 0, 0),
                    usdcEquivalent: usdcEquivalentMintPrice,
                    candyMachineAddress,
                  },
                },
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
        comicName,
        royaltyWallets,
        statelessCovers,
        darkblockId,
        supply,
        assetOnChainName,
        rarityCoverFiles,
      );

      const metadataCreateData = itemMetadatas.map((item) => {
        return {
          uri: item.metadata.uri,
          isUsed: item.isUsed,
          isSigned: item.isSigned,
          rarity: PrismaComicRarity[ComicRarity[item.rarity].toString()],
          collectionName: assetOnChainName,
          collectionAddress: collectionAddress.toString(),
        };
      });

      await this.prisma.collectibleComicMetadata.createMany({
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

    this.heliusService.subscribeTo(candyMachineAddress);
    return candyMachine;
  }

  /* Create Multiple Mint transactions */
  async createMintTransaction(
    feePayer: UmiPublicKey,
    candyMachineAddress: UmiPublicKey,
    label: string,
    couponId: number,
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
          couponId,
          userId,
        ),
      );
    }
    return await Promise.all(transactions);
  }

  /* Create Single Mint transaction */
  async createMintOneTransaction(
    feePayer: UmiPublicKey,
    candyMachineAddress: UmiPublicKey,
    label: string,
    couponId: number,
    userId?: number,
  ) {
    const {
      eligibleWallets,
      lookupTable,
      mintPrice,
      tokenStandard,
      userWhiteList,
      couponType,
      numberOfRedemptions,
      startsAt,
      expiresAt,
    } = await this.findCandyMachineCouponData(couponId, label);

    const currentDate = new Date();
    if (startsAt && startsAt > currentDate) {
      throw new UnauthorizedException('Coupon is not active yet.');
    }

    if (expiresAt && expiresAt < currentDate) {
      throw new UnauthorizedException('Coupon is expired.');
    }

    const balance = await this.umi.rpc.getBalance(feePayer);
    validateBalanceForMint(
      mintPrice,
      Number(balance.basisPoints),
      tokenStandard,
    );

    if (tokenStandard !== TokenStandard.Core) {
      throw new BadRequestException('Invalid token standard');
    }

    const isPublicMint =
      couponType === CouponType.PublicUser ||
      couponType === CouponType.WhitelistedWallet;

    if (!isPublicMint) {
      if (!userId) {
        throw new UnauthorizedException(
          "Mint is limited to Users, make sure you're signed in!",
        );
      }

      if (couponType === CouponType.WhitelistedUser) {
        const isWhitelisted = findUserInUserWhiteList(userId, userWhiteList);
        if (!isWhitelisted) {
          throw new UnauthorizedException(
            'User is not eligible for this mint !',
          );
        }
      }
    }

    if (numberOfRedemptions) {
      const itemsMinted = isPublicMint
        ? await this.countWalletItemsMintedQuery(
            candyMachineAddress.toString(),
            feePayer.toString(),
          )
        : await this.countUserItemsMintedQuery(
            candyMachineAddress.toString(),
            userId,
          );

      if (itemsMinted >= numberOfRedemptions) {
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
      eligibleWallets,
      lookupTable,
      true,
    );
  }

  /* Find Candy Machine And Coupon Details*/
  async find(query: CandyMachineParams, userId?: number) {
    const { candyMachineAddress: address, walletAddress } = query;

    const candyMachine = await this.prisma.candyMachine.findUnique({
      where: { address },
      include: {
        coupons: {
          include: { currencySettings: true, users: true, wallets: true },
        },
      },
    });

    if (!candyMachine) {
      throw new NotFoundException(
        `Candy Machine with address ${address} does not exist`,
      );
    }

    const defaultCoupon = candyMachine.coupons.find(
      (coupon) => coupon.type === CouponType.PublicUser,
    );

    let numberOfUserMints = 0;
    if (userId) {
      numberOfUserMints = await this.countUserItemsMintedQuery(
        candyMachine.address,
        userId,
      );
    } else {
      numberOfUserMints = await this.countWalletItemsMintedQuery(
        candyMachine.address,
        walletAddress,
      );
    }

    const coupons: CandyMachineCouponWithStats[] = await Promise.all(
      candyMachine.coupons.map(
        async (coupon): Promise<CandyMachineCouponWithStats> => {
          const { isEligible, itemsMinted } =
            await this.getCandyMachineCouponStats(
              coupon,
              walletAddress,
              userId,
            );

          const discount = findCandyMachineCouponDiscount(
            coupon,
            defaultCoupon,
          );
          return {
            ...coupon,
            discount,
            prices: coupon.currencySettings.map((price) => ({
              mintPrice: Number(price.mintPrice),
              usdcEquivalent: price.usdcEquivalent,
              splTokenAddress: price.splTokenAddress,
            })),
            stats: {
              isEligible,
              itemsMinted,
            },
          };
        },
      ),
    );

    return { ...candyMachine, numberOfUserMints, coupons };
  }

  async findReceipts(query: CandyMachineReceiptParams) {
    const receipts = await this.prisma.candyMachineReceipt.findMany({
      where: { candyMachineAddress: query.candyMachineAddress },
      include: { collectibleComic: true, buyer: { include: { user: true } } },
      orderBy: { timestamp: 'desc' },
      skip: query.skip,
      take: query.take,
    });

    return receipts;
  }

  async addEligibleUsersToCoupon(couponId: number, usernames: string[]) {
    const users = await this.prisma.user.findMany({
      where: {
        name: { in: usernames },
        eligibleCandyMachineCoupons: {
          none: { couponId },
        },
      },
    });

    await this.prisma.candyMachineCoupon.update({
      where: { id: couponId },
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

  async addEligibleWalletsToCoupon(couponId: number, wallets: string[]) {
    const whiteListedWallets =
      await this.prisma.candyMachineCouponEligibleWallet
        .findMany({
          where: { couponId },
        })
        .then((whiteListedWallets) =>
          whiteListedWallets.map(
            (whiteListedWallet) => whiteListedWallet.walletAddress,
          ),
        );

    const filteredWallets = wallets.filter(
      (wallet) => !whiteListedWallets.includes(wallet),
    );

    await this.prisma.candyMachineCoupon.update({
      where: { id: couponId },
      data: {
        wallets: {
          create: filteredWallets.map((wallet) => {
            return {
              walletAddress: wallet,
              wallet: {
                connectOrCreate: {
                  where: { address: wallet },
                  create: { address: wallet },
                },
              },
            };
          }),
        },
      },
    });
  }

  async addCandyMachineCoupon(
    candyMachineAddress: string,
    params: AddCandyMachineCouponDto,
  ) {
    const {
      name,
      description,
      supply,
      startsAt,
      expiresAt,
      numberOfRedemptions,
      couponType,
      mintPrice,
      usdcEquivalent,
    } = params;

    const couponsCount = await this.prisma.candyMachineCoupon.count({
      where: {
        type: couponType,
        candyMachineAddress,
      },
    });

    const label = getCouponLabel(couponType, couponsCount, 0);
    const splTokenAddress =
      params.splTokenAddress ?? WRAPPED_SOL_MINT.toBase58();

    const isSupportedToken = await this.prisma.splToken.findFirst({
      where: { address: splTokenAddress },
    });

    if (!isSupportedToken) {
      throw new BadRequestException('Spl token is not supported');
    }

    await this.addCoreCandyMachineGroupOnChain(candyMachineAddress, {
      ...params,
      label,
      splTokenAddress,
    });
    const candyMachineCoupon = await this.prisma.candyMachineCoupon.create({
      data: {
        name,
        description,
        supply,
        startsAt,
        expiresAt,
        numberOfRedemptions,
        type: couponType,
        candyMachine: {
          connect: {
            address: candyMachineAddress,
          },
        },
        currencySettings: {
          create: {
            label,
            mintPrice,
            usdcEquivalent,
            splTokenAddress,
            candyMachineAddress,
          },
        },
      },
    });

    return candyMachineCoupon;
  }

  async addCandyMachineCouponPriceConfig(
    couponId: number,
    params: AddCandyMachineCouponPriceConfigDto,
  ) {
    const { mintPrice, usdcEquivalent } = params;

    const splTokenAddress =
      params.splTokenAddress ?? WRAPPED_SOL_MINT.toBase58();
    const isSupportedToken = await this.prisma.splToken.findFirst({
      where: { address: splTokenAddress },
    });

    if (!isSupportedToken) {
      throw new BadRequestException('Spl token is not supported');
    }

    const candyMachineCoupon = await this.prisma.candyMachineCoupon.findUnique({
      where: { id: couponId },
    });

    const candyMachineAddress = candyMachineCoupon.candyMachineAddress;

    const couponsCount = await this.prisma.candyMachineCoupon.count({
      where: {
        type: candyMachineCoupon.type,
        candyMachineAddress,
      },
    });

    const currencySettingsCount =
      await this.prisma.candyMachineCouponCurrencySetting.count({
        where: {
          couponId,
        },
      });

    const label = getCouponLabel(
      candyMachineCoupon.type,
      couponsCount,
      currencySettingsCount,
    );

    await this.addCoreCandyMachineGroupOnChain(candyMachineAddress, {
      ...candyMachineCoupon,
      couponType: candyMachineCoupon.type,
      label,
      ...params,
      splTokenAddress,
    });

    await this.prisma.candyMachineCouponCurrencySetting.create({
      data: {
        coupon: {
          connect: {
            id: couponId,
          },
        },
        label,
        splTokenAddress,
        mintPrice,
        usdcEquivalent,
        candyMachineAddress,
      },
    });
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

  private countUserItemsMintedQuery = (
    candyMachineAddress: string,
    userId: number,
    couponId?: number,
  ) => {
    return this.prisma.candyMachineReceipt.count({
      where: { candyMachineAddress, userId, couponId },
    });
  };

  // Wallet whitelist group should be public
  private countWalletItemsMintedQuery = (
    candyMachineAddress: string,
    buyerAddress: string,
    couponId?: number,
  ) => {
    return this.prisma.candyMachineReceipt.count({
      where: {
        candyMachineAddress,
        buyerAddress,
        couponId,
      },
    });
  };

  private async checkWhitelistedWalletCouponEligibility(
    coupon: CandyMachineCouponWithEligibleUsersAndWallets,
    walletAddress: string,
  ) {
    const walletItemsMinted = await this.countWalletItemsMintedQuery(
      coupon.candyMachineAddress,
      walletAddress,
      coupon.id,
    );
    const redemptionLimitReached = coupon.numberOfRedemptions
      ? coupon.numberOfRedemptions <= walletItemsMinted
      : false;

    const isEligible =
      findWalletInWalletWhiteList(walletAddress, coupon.wallets) &&
      !redemptionLimitReached;

    return {
      isEligible,
      walletItemsMinted,
    };
  }

  private async checkWhitelistedUserCouponEligibility(
    coupon: CandyMachineCouponWithEligibleUsersAndWallets,
    userId: number,
  ) {
    const itemsMinted = await this.countUserItemsMintedQuery(
      coupon.candyMachineAddress,
      userId,
      coupon.id,
    );

    const redemptionLimitReached = coupon.numberOfRedemptions
      ? coupon.numberOfRedemptions <= itemsMinted
      : false;

    const isEligible =
      findUserInUserWhiteList(userId, coupon.users) && !redemptionLimitReached;

    return {
      isEligible,
      itemsMinted,
    };
  }

  private async checkPublicCouponEligibility(
    coupon: CandyMachineCouponWithEligibleUsersAndWallets,
    walletAddress: string,
  ) {
    const itemsMinted = await this.countWalletItemsMintedQuery(
      coupon.candyMachineAddress,
      walletAddress,
      coupon.id,
    );

    const isEligible = coupon.numberOfRedemptions
      ? coupon.numberOfRedemptions > itemsMinted
      : true;

    return {
      isEligible,
      itemsMinted,
    };
  }

  private async checkUserCouponEligibility(
    coupon: CandyMachineCouponWithEligibleUsersAndWallets,
    userId: number,
  ) {
    const itemsMinted = await this.countUserItemsMintedQuery(
      coupon.candyMachineAddress,
      userId,
      coupon.id,
    );

    const isEligible = coupon.numberOfRedemptions
      ? coupon.numberOfRedemptions > itemsMinted
      : true;

    return {
      isEligible,
      itemsMinted,
    };
  }

  private async getCandyMachineCouponStats(
    coupon: CandyMachineCouponWithEligibleUsersAndWallets,
    walletAddress?: string,
    userId?: number,
  ): Promise<{
    isEligible: boolean;
    itemsMinted?: number;
  }> {
    // Check if wallet address is provided
    if (
      !walletAddress &&
      (coupon.type === CouponType.PublicUser ||
        coupon.type === CouponType.WhitelistedWallet)
    ) {
      return { isEligible: false };
    }

    // Check if user ID is missing for user-specific whitelist types
    if (
      !userId &&
      (coupon.type === CouponType.RegisteredUser ||
        coupon.type === CouponType.WhitelistedUser)
    ) {
      return { isEligible: false };
    }

    switch (coupon.type) {
      case CouponType.PublicUser:
        return this.checkPublicCouponEligibility(coupon, walletAddress);
      case CouponType.RegisteredUser:
        return this.checkUserCouponEligibility(coupon, userId);
      case CouponType.WhitelistedUser:
        return this.checkWhitelistedUserCouponEligibility(coupon, userId);
      case CouponType.WhitelistedWallet:
        return this.checkWhitelistedWalletCouponEligibility(
          coupon,
          walletAddress,
        );
      default:
        return { isEligible: false };
    }
  }

  private async findCandyMachineCouponData(couponId: number, label: string) {
    try {
      const {
        wallets: eligibleWallets,
        users: eligibleUsers,
        candyMachine,
        currencySettings,
        ...candyMachineCoupon
      } = await this.prisma.candyMachineCoupon.findUnique({
        where: { id: couponId },
        include: {
          wallets: true,
          candyMachine: true,
          users: true,
          currencySettings: true,
        },
      });

      if (!candyMachineCoupon) {
        throw new NotFoundException();
      }

      const currencySetting = currencySettings.find(
        (item) => item.label === label,
      );

      return {
        couponType: candyMachineCoupon.type,
        eligibleWallets: eligibleWallets.length
          ? eligibleWallets.map((item) => item.walletAddress)
          : [],
        userWhiteList:
          eligibleUsers && eligibleUsers.length ? eligibleUsers : [],
        lookupTable: candyMachine.lookupTable,
        mintPrice: Number(currencySetting.mintPrice),
        tokenStandard: candyMachine.standard,
        numberOfRedemptions: candyMachineCoupon.numberOfRedemptions,
        startsAt: candyMachineCoupon.startsAt,
        expiresAt: candyMachineCoupon.expiresAt,
      };
    } catch (e) {
      console.error(e);
    }
  }

  private async addCoreCandyMachineGroupOnChain(
    candyMachineAddress: string,
    params: AddCandyMachineCouponConfigParams,
  ) {
    const { mintPrice, supply, splTokenAddress, label } = params;

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

    // Mint limit, Start date and end date are centralized using third party signer

    // let startDateGuard: StartDate;
    // if (startsAt) startDateGuard = { date: umiDateTime(startsAt) };

    // let endDateGuard: EndDate;
    // if (expiresAt) endDateGuard = { date: umiDateTime(expiresAt) };

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
      paymentGuardName = 'solPayment';
      paymentGuard = {
        lamports: umiLamports(mintPrice),
        destination: publicKey(FUNDS_DESTINATION_ADDRESS),
      };
    } else {
      paymentGuardName = 'tokenPayment';
      paymentGuard = {
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
        // startDate: startDate ? some(startDateGuard) : none(),
        // endDate: endDate ? some(endDateGuard) : none(),
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

  private async getComicIssueCovers(comicIssue: ComicIssueCMInput) {
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

  private async getOrCreateComicIssueCollection(
    comicIssue: ComicIssueCMInput,
    onChainName: string,
    royaltyWallets: RoyaltyWalletDto[],
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
    const collectionAsset =
      await this.prisma.collectibleComicCollection.findUnique({
        where: {
          comicIssueId,
          candyMachines: { some: { standard: tokenStandard } },
        },
      });

    let darkblockId = '';

    // Core standard doesn't allow same collection to be expanded in supply as of now so candymachine create will fail if used old collection
    if (collectionAsset) {
      throw new BadRequestException('Collection already exists');
    }

    let darkblockMetadataFile: MetadataFile;
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

    const collection = generateSigner(umi);
    const creators = royaltyWallets.map((item) => {
      return {
        address: publicKey(item.address),
        percentage: item.share,
      };
    });

    const nonceArgs = await this.nonceService.getNonce();
    await createCoreCollection(
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

    const collectionAddress = new PublicKey(collection.publicKey);
    await this.prisma.collectibleComicCollection.create({
      data: {
        name: onChainName,
        comicIssue: { connect: { id: comicIssue.id } },
        digitalAsset: {
          create: {
            address: collectionAddress.toBase58(),
            royaltyWallets: {
              create: royaltyWallets,
            },
            owner: {
              connectOrCreate: {
                where: { address: this.umi.identity.publicKey.toString() },
                create: {
                  address: this.umi.identity.publicKey.toString(),
                  createdAt: new Date(),
                },
              },
            },
            ownerChangedAt: new Date(),
          },
        },
      },
    });

    return { collectionAddress, darkblockId };
  }
}
