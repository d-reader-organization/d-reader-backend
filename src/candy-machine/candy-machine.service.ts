import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AddressLookupTableAccount,
  Connection,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { PrismaService } from 'nestjs-prisma';
import {
  Metaplex,
  WRAPPED_SOL_MINT,
  MetaplexFile,
} from '@metaplex-foundation/js';
import { s3toMxFile } from '../utils/files';
import { constructMultipleMintTransaction } from './instructions';
import { HeliusService } from '../webhooks/helius/helius.service';
import { CandyMachineReceiptParams } from './dto/candy-machine-receipt-params.dto';
import {
  D_PUBLISHER_SYMBOL,
  HUNDRED,
  D_READER_FRONTEND_URL,
  FUNDS_DESTINATION_ADDRESS,
  MIN_COMPUTE_PRICE,
  SOL_ADDRESS,
  AUTHORITY_GROUP_LABEL,
  HOUR_SECONDS,
  MINUTE_SECONDS,
  DAY_SECONDS,
} from '../constants';
import {
  findCandyMachineCouponDiscount,
  getCouponLabel,
} from '../utils/helpers';
import {
  MetadataFile,
  getConnection,
  getThirdPartySigner,
  getThirdPartyUmiSignature,
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
  TransactionStatus,
  Prisma,
} from '@prisma/client';
import {
  CandyMachineCouponWithWhitelist,
  CandyMachineCouponWithStats,
  CreateCandyMachineParams,
  AddCandyMachineCouponParams,
  AddCandyMachineGroupOnChainParams,
  AddCandyMachineCouponParamsWithLabels,
  CandyMachineMintData,
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
  MPL_CORE_CANDY_GUARD_PROGRAM_ID,
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
import { getAssetsByGroup, getTransactionWithPriorityFee } from '../utils/das';
import { RoyaltyWalletDto } from '../comic-issue/dto/royalty-wallet.dto';
import { AddCandyMachineCouponDto } from './dto/add-candy-machine-coupon.dto';
import { AddCandyMachineCouponCurrencySettingDto } from './dto/add-coupon-currency-setting.dto';
import { decodeUmiTransaction, verifySignature } from '../utils/transactions';
import { getMintV1InstructionDataSerializer } from '@metaplex-foundation/mpl-core-candy-machine/dist/src/generated/instructions/mintV1';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { isEmpty, isNull } from 'lodash';
import { CacheService } from '../cache/cache.service';
import { getLookupTableAccounts } from '../utils/lookup-table';
import { CachePath } from '../utils/cache';
import { Cacheable } from 'src/cache/cache.decorator';

@Injectable()
export class CandyMachineService {
  private readonly metaplex: Metaplex;
  private readonly umi: Umi;
  private readonly connection: Connection;

  constructor(
    private readonly prisma: PrismaService,
    private readonly heliusService: HeliusService,
    private readonly darkblockService: DarkblockService,
    private readonly nonceService: NonceService,
    private readonly cacheService: CacheService,
  ) {
    this.metaplex = metaplex;
    this.umi = umi;
    this.connection = getConnection();
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

    const { supply, assetOnChainName, comicName, coupons } =
      createCandyMachineParams;
    const couponsWithLabel = this.getCouponsWithLabels(coupons);

    console.log('Create Core Candy Machine');
    const nonceArgs = await this.nonceService.getNonce();
    const [candyMachinePubkey, lut] = await createCoreCandyMachine(
      this.umi,
      publicKey(collectionAddress),
      { ...createCandyMachineParams, coupons: couponsWithLabel },
      nonceArgs,
    );

    if (nonceArgs) {
      await this.nonceService.updateNonce(new PublicKey(nonceArgs.address));
    }

    const candyMachine = await fetchCandyMachine(umi, candyMachinePubkey, {
      commitment: 'confirmed',
    });
    const candyMachineAddress = candyMachine.publicKey.toString();
    const comicVaultCoupon = {
      name: AUTHORITY_GROUP_LABEL,
      supply: 0,
      type: CouponType.WhitelistedWallet,
      description: 'This coupon is for Comic vault items',
      currencySettings: [
        {
          label: AUTHORITY_GROUP_LABEL,
          splTokenAddress: SOL_ADDRESS,
          mintPrice: 0,
          usdcEquivalent: 0,
        },
      ],
    };
    couponsWithLabel.push(comicVaultCoupon);

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
        coupons: {
          create: couponsWithLabel.map((coupon) => ({
            ...coupon,
            currencySettings: {
              create: coupon.currencySettings.map((setting) => ({
                ...setting,
                candyMachineAddress,
              })),
            },
          })),
        },
      },
    });

    try {
      const itemMetadatas = await insertCoreItems(
        this.umi,
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
          uri: item.uri,
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
    walletAddress: UmiPublicKey,
    candyMachineAddress: UmiPublicKey,
    label: string,
    couponId: number,
    numberOfItems?: number,
    userId?: number,
  ) {
    const { lookupTable, isSponsored } = await this.prepareMintTransaction(
      walletAddress,
      candyMachineAddress,
      label,
      couponId,
      numberOfItems,
      userId,
    );
    const CORE_MINT_COMPUTE_BUDGET = 800000;

    const transactions = await getTransactionWithPriorityFee(
      constructMultipleMintTransaction,
      CORE_MINT_COMPUTE_BUDGET,
      this.umi,
      publicKey(candyMachineAddress),
      walletAddress,
      label,
      numberOfItems ?? 1,
      lookupTable,
      isSponsored,
    );

    return transactions;
  }

  /* Validate if mint transaction should be constructed and partially prepare it */
  async prepareMintTransaction(
    walletAddress: UmiPublicKey,
    candyMachineAddress: UmiPublicKey,
    label: string,
    couponId: number,
    numberOfItems: number,
    userId?: number,
  ): Promise<{ lookupTable: string | undefined; isSponsored: boolean }> {
    const {
      mintPrice,
      tokenStandard,
      couponType,
      isSponsored,
      numberOfRedemptions,
      startsAt,
      expiresAt,
      lookupTable,
      splToken,
    } = await this.findCandyMachineCouponData(couponId, label);

    this.validateCouponDates(startsAt, expiresAt);
    this.validateTokenStandard(tokenStandard);
    this.validateMintEligibility(couponType, userId, walletAddress, couponId);

    await this.validateWalletBalance(
      walletAddress,
      mintPrice,
      tokenStandard,
      numberOfItems,
      splToken,
      isSponsored,
    );

    await this.validateMintLimit(
      numberOfRedemptions,
      numberOfItems,
      couponType,
      candyMachineAddress,
      couponId,
      walletAddress,
      userId,
    );

    return { lookupTable, isSponsored };
  }

  async validateAndSendMintTransaction(
    transactions: string[],
    walletAddress: string,
    userId?: number,
  ) {
    /** Deserialize transactions */
    const mintTransaction = VersionedTransaction.deserialize(
      Buffer.from(transactions[1], 'base64'),
    );
    const authenticationTransaction = VersionedTransaction.deserialize(
      Buffer.from(transactions[0], 'base64'),
    );

    /** Fetch lookup table and decompile mint transaction */
    let lookupTableAccounts: AddressLookupTableAccount;
    if (mintTransaction.message.addressTableLookups.length) {
      const lookupTableAddress =
        mintTransaction.message.addressTableLookups[0].accountKey;

      const cacheKey = CachePath.lookupTableAccounts(
        lookupTableAddress.toString(),
      );
      lookupTableAccounts = await this.cacheService.fetchAndCache(
        cacheKey,
        getLookupTableAccounts,
        2 * HOUR_SECONDS,
        lookupTableAddress,
      );
    }

    const mintInstructions = TransactionMessage.decompile(
      mintTransaction.message,
      {
        addressLookupTableAccounts: lookupTableAccounts
          ? [lookupTableAccounts]
          : [],
      },
    );

    const baseInstruction = mintInstructions.instructions.at(-1);
    const baseInstructionAccounts = baseInstruction.keys;

    const candyMachineAddress = baseInstructionAccounts.at(2).pubkey.toString();
    const minterAddress = baseInstructionAccounts.at(5).pubkey.toString();

    if (minterAddress != walletAddress) {
      throw new BadRequestException('Invalid minter address!');
    }

    const mintV1Serializer = getMintV1InstructionDataSerializer();
    const ixData = mintV1Serializer.deserialize(baseInstruction.data)[0];
    const label =
      ixData.group.__option == 'Some' ? ixData.group.value : undefined;

    /** Fetch coupon details and run assertions */
    const { coupon, ...currencySetting } =
      await this.prisma.candyMachineCouponCurrencySetting.findUnique({
        where: { label_candyMachineAddress: { label, candyMachineAddress } },
        include: { coupon: true },
      });

    const publicMintTypes: CouponType[] = [
      CouponType.PublicUser,
      CouponType.WhitelistedWallet,
    ];

    const isPublicMint = publicMintTypes.includes(coupon.type);
    if (!isPublicMint && !userId) {
      throw new UnauthorizedException(
        'Only registered users are eligible for this coupon !',
      );
    }

    const { mintPrice, splTokenAddress } = currencySetting;
    const assetAccounts: PublicKey[] = [];

    mintInstructions.instructions.forEach((instruction) => {
      const isMintInstruction =
        instruction.programId.toString() ===
        MPL_CORE_CANDY_GUARD_PROGRAM_ID.toString();

      if (isMintInstruction) {
        const assetAddress = instruction.keys.at(7);
        assetAccounts.push(assetAddress.pubkey);
      }
    });

    const numberOfItems = assetAccounts.length;
    const thirdPartySigner = getThirdPartySigner();
    const authMessageBytes = authenticationTransaction.message.serialize();
    const authTransactionSignatures = authenticationTransaction.signatures;

    /** Verify signature for third party signer */
    if (
      !verifySignature(
        authMessageBytes,
        authTransactionSignatures,
        thirdPartySigner.toBytes(),
      )
    ) {
      throw new UnauthorizedException('Unverified Transaction');
    }

    /** Verify signatures for all asset accounts */
    for (const assetAccount of assetAccounts) {
      const assetAccountPublicKey = new PublicKey(assetAccount);

      if (
        !verifySignature(
          authMessageBytes,
          authTransactionSignatures,
          assetAccountPublicKey.toBytes(),
        )
      ) {
        throw new BadRequestException(
          `Unauthorized mint transaction for asset account: ${assetAccountPublicKey.toString()}`,
        );
      }
    }

    /** sign and send mint transaction */
    const umiMintTransaction = decodeUmiTransaction(transactions[1]);

    let signedMintTransaction = umiMintTransaction;
    if (coupon.id == 51 && splTokenAddress === SOL_ADDRESS) {
      signedMintTransaction = umiMintTransaction;
    } else {
      signedMintTransaction = await getThirdPartyUmiSignature(
        umiMintTransaction,
      );
    }

    console.log(`Mint by wallet ${walletAddress} is verified`);
    const signature = await this.umi.rpc.sendTransaction(signedMintTransaction);

    const transactionSignature = base58.deserialize(signature)[0];
    const receiptData: Prisma.CandyMachineReceiptCreateInput = {
      description: `Minted ${numberOfItems} items from ${candyMachineAddress}`,
      candyMachine: {
        connect: { address: candyMachineAddress },
      },
      couponId: coupon.id,
      buyer: {
        connectOrCreate: {
          where: { address: minterAddress },
          create: { address: minterAddress },
        },
      },
      label,
      numberOfItems,
      status: TransactionStatus.Processing,
      transactionSignature,
      price: mintPrice,
      timestamp: new Date(),
      splTokenAddress,
    };

    if (userId) {
      receiptData.user = {
        connect: { id: userId },
      };
    }

    await this.prisma.candyMachineReceipt.create({ data: receiptData });
    return signature;
  }

  /* Find Candy Machine And Coupon Details*/
  async find(query: CandyMachineParams, userId?: number) {
    const { candyMachineAddress: address, walletAddress } = query;

    const candyMachine = await this.prisma.candyMachine.findUnique({
      where: { address },
      include: {
        coupons: {
          include: { currencySettings: true },
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

    const coupons: CandyMachineCouponWithStats[] = [];
    for await (const coupon of candyMachine.coupons) {
      const { isEligible, itemsMinted } = await this.getCandyMachineCouponStats(
        coupon,
        walletAddress,
        userId,
      );

      const discount = findCandyMachineCouponDiscount(coupon, defaultCoupon);

      const couponData = {
        ...coupon,
        discount,
        prices: coupon.currencySettings.map((price) => ({
          label: price.label,
          mintPrice: Number(price.mintPrice),
          usdcEquivalent: price.usdcEquivalent,
          splTokenAddress: price.splTokenAddress,
        })),
        stats: {
          isEligible,
          itemsMinted,
        },
      };
      coupons.push(couponData);
    }

    return { ...candyMachine, coupons };
  }

  async findReceipts(query: CandyMachineReceiptParams) {
    const receipts = await this.prisma.candyMachineReceipt.findMany({
      where: { candyMachineAddress: query.candyMachineAddress },
      include: { collectibleComics: true, buyer: { include: { user: true } } },
      orderBy: { timestamp: 'desc' },
      skip: query.skip,
      take: query.take,
    });

    return receipts;
  }

  async addWhitelistedUsersToCoupon(couponId: number, usernames: string[]) {
    const users = await this.prisma.user.findMany({
      where: {
        name: { in: usernames },
        whitelistedCandyMachineCoupons: {
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

  async addWhitelistedWalletsToCoupon(
    couponId: number,
    wallets: string[],
    collectionAddress?: string,
  ) {
    let collectionHolders: string[] = [];
    if (collectionAddress) {
      collectionHolders = await this.fetchCollectionHolders(collectionAddress);
    }
    const whiteListedWallets =
      await this.prisma.candyMachineCouponWhitelistedWallet
        .findMany({
          where: { couponId },
        })
        .then((whiteListedWallets) =>
          whiteListedWallets.map(
            (whiteListedWallet) => whiteListedWallet.walletAddress,
          ),
        );

    const totalWallets = [...collectionHolders, ...wallets];
    const filteredWallets = totalWallets.filter(
      (wallet) => !whiteListedWallets.includes(wallet),
    );

    await this.prisma.candyMachineCoupon.update({
      where: { id: couponId },
      data: {
        wallets: {
          create: filteredWallets.map((wallet) => {
            return {
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

    const couponTypeIteration = await this.prisma.candyMachineCoupon.count({
      where: {
        type: couponType,
        candyMachineAddress,
      },
    });

    // When a coupon adds for first time, the currency iterations would always be 0
    const label = getCouponLabel(couponType, couponTypeIteration, 0);
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

  async addCandyMachineCouponCurrency(
    couponId: number,
    params: AddCandyMachineCouponCurrencySettingDto,
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

    // TODO: Maybe use a coupon priority or number for labels
    const couponTypeIteration = await this.prisma.candyMachineCoupon.count({
      where: {
        type: candyMachineCoupon.type,
        candyMachineAddress,
      },
    });

    const currencyCouponIteration =
      await this.prisma.candyMachineCouponCurrencySetting.count({
        where: {
          couponId,
        },
      });

    const label = getCouponLabel(
      candyMachineCoupon.type,
      couponTypeIteration,
      currencyCouponIteration,
    );

    await this.addCoreCandyMachineGroupOnChain(candyMachineAddress, {
      supply: candyMachineCoupon.supply,
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

  private countUserItemsMintedQuery = async (
    userId: number,
    couponId: number,
  ) => {
    const data = await this.prisma.candyMachineReceipt.aggregate({
      where: {
        userId,
        couponId,
        status: TransactionStatus.Confirmed,
      },
      _sum: { numberOfItems: true },
    });

    return data?._sum?.numberOfItems || 0;
  };

  // Wallet whitelist group should be public
  private countWalletItemsMintedQuery = async (
    buyerAddress: string,
    couponId: number,
  ) => {
    const data = await this.prisma.candyMachineReceipt.aggregate({
      where: {
        buyerAddress,
        couponId,
        status: TransactionStatus.Confirmed,
      },
      _sum: { numberOfItems: true },
    });

    return data?._sum?.numberOfItems || 0;
  };

  private async checkWhitelistedWalletCouponEligibility(
    coupon: CandyMachineCouponWithWhitelist,
    walletAddress: string,
  ) {
    const walletItemsMinted = await this.countWalletItemsMintedQuery(
      walletAddress,
      coupon.id,
    );
    const redemptionLimitReached = coupon.numberOfRedemptions
      ? coupon.numberOfRedemptions <= walletItemsMinted
      : false;

    let isEligible = !redemptionLimitReached;
    if (isEligible) {
      isEligible = await this.findWalletWhitelisted(walletAddress, coupon.id);
    }

    return {
      isEligible,
      itemsMinted: walletItemsMinted,
    };
  }

  private async checkWhitelistedUserCouponEligibility(
    coupon: CandyMachineCouponWithWhitelist,
    userId: number,
  ) {
    const itemsMinted = await this.countUserItemsMintedQuery(userId, coupon.id);

    const redemptionLimitReached = coupon.numberOfRedemptions
      ? coupon.numberOfRedemptions <= itemsMinted
      : false;

    let isEligible = !redemptionLimitReached;

    if (isEligible) {
      isEligible = await this.findUserWhitelisted(userId, coupon.id);
    }

    return {
      isEligible,
      itemsMinted,
    };
  }

  private async checkPublicCouponEligibility(
    coupon: CandyMachineCouponWithWhitelist,
    walletAddress: string,
  ) {
    const itemsMinted = await this.countWalletItemsMintedQuery(
      walletAddress,
      coupon.id,
    );

    const isEligible = !isNull(coupon.numberOfRedemptions)
      ? coupon.numberOfRedemptions > itemsMinted
      : true;

    return {
      isEligible,
      itemsMinted,
    };
  }

  private async checkUserCouponEligibility(
    coupon: CandyMachineCouponWithWhitelist,
    userId: number,
  ) {
    const itemsMinted = await this.countUserItemsMintedQuery(userId, coupon.id);

    const isEligible = coupon.numberOfRedemptions
      ? coupon.numberOfRedemptions > itemsMinted
      : true;

    return {
      isEligible,
      itemsMinted,
    };
  }

  private async getCandyMachineCouponStats(
    coupon: CandyMachineCouponWithWhitelist,
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

  @Cacheable(10 * MINUTE_SECONDS)
  private async findCandyMachineCouponData(
    couponId: number,
    label: string,
  ): Promise<CandyMachineMintData> {
    const { candyMachine, currencySettings, ...candyMachineCoupon } =
      await this.prisma.candyMachineCoupon.findUnique({
        where: { id: couponId },
        include: {
          candyMachine: true,
          currencySettings: true,
        },
      });

    if (!candyMachineCoupon) {
      throw new NotFoundException();
    }

    const currencySetting = currencySettings.find(
      (item) => item.label === label,
    );

    const supportedTokens = await this.cacheService.fetchAndCache(
      CachePath.SupportedSplTokens,
      this.prisma.splToken.findMany,
      DAY_SECONDS,
    );
    const splToken = supportedTokens.find(
      (token) => token.address == currencySetting.splTokenAddress,
    );

    return {
      couponType: candyMachineCoupon.type,
      isSponsored: candyMachineCoupon.isSponsored,
      lookupTable: candyMachine.lookupTable,
      mintPrice: Number(currencySetting.mintPrice),
      splToken: {
        address: currencySetting.splTokenAddress,
        decimals: splToken.decimals,
        symbol: splToken.symbol,
      },
      tokenStandard: candyMachine.standard,
      numberOfRedemptions: candyMachineCoupon.numberOfRedemptions,
      startsAt: candyMachineCoupon.startsAt,
      expiresAt: candyMachineCoupon.expiresAt,
    };
  }

  private async addCoreCandyMachineGroupOnChain(
    candyMachineAddress: string,
    params: AddCandyMachineGroupOnChainParams,
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

    if (collectionAsset) {
      return {
        collectionAddress: collectionAsset.address,
        darkblockId: collectionAsset.darkblockId || '',
      };
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

  // Create labels for each currency setting in coupon
  private getCouponsWithLabels(
    coupons: AddCandyMachineCouponParams[],
  ): AddCandyMachineCouponParamsWithLabels[] {
    const typeFrequencyMap = new Map<CouponType, number>();

    // Initialize type frequency map
    coupons.forEach((coupon) => {
      typeFrequencyMap.set(
        coupon.type,
        (typeFrequencyMap.get(coupon.type) || 0) + 1,
      );
    });

    const couponsWithLabel: AddCandyMachineCouponParamsWithLabels[] =
      coupons.map((coupon) => {
        let currencyFrequency = coupon.currencySettings.length;

        // Generate labels for each currency setting
        const typeFrequency = typeFrequencyMap.get(coupon.type)! - 1;
        const currencySettings = coupon.currencySettings.map((currency) => {
          const splTokenAddress = currency.splTokenAddress ?? SOL_ADDRESS;
          currencyFrequency--;

          return {
            ...currency,
            splTokenAddress,
            label: getCouponLabel(
              coupon.type,
              typeFrequency,
              currencyFrequency,
            ),
          };
        });
        typeFrequencyMap.set(coupon.type, typeFrequency);

        return {
          ...coupon,
          currencySettings,
        };
      });

    return couponsWithLabel;
  }

  private validateCouponDates(startsAt?: Date, expiresAt?: Date): void {
    const currentDate = new Date();
    if (startsAt && startsAt > currentDate) {
      throw new UnauthorizedException('Coupon is not active yet.');
    }
    if (expiresAt && expiresAt < currentDate) {
      throw new UnauthorizedException('Coupon is expired.');
    }
  }

  private async validateWalletBalance(
    walletAddress: UmiPublicKey,
    mintPrice: number,
    tokenStandard: TokenStandard,
    numberOfItems: number,
    splToken: CandyMachineMintData['splToken'],
    isSponsored = false,
  ): Promise<void> {
    // TODO: change this in the future so it checks for wallet balance against the mint price
    if (isSponsored) return;

    const solBalance = await this.umi.rpc.getBalance(walletAddress);
    const isSolPayment = splToken.address == SOL_ADDRESS;

    let tokenBalance = 0;
    if (!isSolPayment) {
      const tokenAccount = await getAssociatedTokenAddress(
        new PublicKey(splToken.address),
        new PublicKey(walletAddress.toString()),
      );

      const response = await this.connection.getAccountInfoAndContext(
        tokenAccount,
      );
      if (response.value) {
        const balance = await this.connection.getTokenAccountBalance(
          tokenAccount,
        );
        tokenBalance = Number(balance.value.amount);
      }
    }

    validateBalanceForMint(
      mintPrice,
      Number(solBalance.basisPoints),
      tokenBalance,
      splToken.symbol,
      splToken.decimals,
      numberOfItems,
      isSolPayment,
      tokenStandard,
    );
  }

  private validateTokenStandard(tokenStandard: TokenStandard): void {
    if (tokenStandard !== TokenStandard.Core) {
      throw new BadRequestException('Invalid token standard');
    }
  }

  private async validateMintEligibility(
    couponType: CouponType,
    userId: number | undefined,
    walletAddress: UmiPublicKey,
    couponId: number,
  ): Promise<void> {
    const publicMintTypes: CouponType[] = [
      CouponType.PublicUser,
      CouponType.WhitelistedWallet,
    ];
    const isPublicMint = publicMintTypes.includes(couponType);

    if (!isPublicMint) {
      if (!userId) {
        throw new UnauthorizedException(
          "Mint is limited to Users, make sure you're signed in!",
        );
      }
      if (
        couponType === CouponType.WhitelistedUser &&
        !(await this.findUserWhitelisted(userId, couponId))
      ) {
        throw new UnauthorizedException('User is not eligible for this mint!');
      }
    } else if (
      couponType === CouponType.WhitelistedWallet &&
      !(await this.findWalletWhitelisted(walletAddress, couponId))
    ) {
      throw new UnauthorizedException(
        'Wallet selected is not eligible for this mint!',
      );
    }
  }

  private async findWalletWhitelisted(walletAddress: string, couponId: number) {
    const isWhitelisted = await this.prisma.wallet.findUnique({
      where: {
        address: walletAddress,
        whitelistedCandyMachineCoupons: { some: { couponId } },
      },
    });
    return !!isWhitelisted;
  }

  private async findUserWhitelisted(userId: number, couponId: number) {
    const isWhitelisted = await this.prisma.user.findUnique({
      where: {
        id: userId,
        whitelistedCandyMachineCoupons: { some: { couponId } },
      },
    });
    return !!isWhitelisted;
  }

  private async validateMintLimit(
    numberOfRedemptions: number | undefined,
    numberOfItems: number,
    couponType: CouponType,
    candyMachineAddress: UmiPublicKey,
    couponId: number,
    walletAddress: UmiPublicKey,
    userId: number | undefined,
  ): Promise<void> {
    if (numberOfRedemptions === 0) {
      throw new UnauthorizedException('Unauthorized to use this coupon');
    }

    if (numberOfRedemptions) {
      const publicMintTypes: CouponType[] = [
        CouponType.PublicUser,
        CouponType.WhitelistedWallet,
      ];
      const isPublicMint = publicMintTypes.includes(couponType);

      const itemsMinted = isPublicMint
        ? await this.countWalletItemsMintedQuery(
            walletAddress.toString(),
            couponId,
          )
        : await this.countUserItemsMintedQuery(userId, couponId);

      if (itemsMinted + numberOfItems > numberOfRedemptions) {
        throw new UnauthorizedException('Mint limit reached!');
      }
    }
  }

  private async fetchCollectionHolders(collectionAddress: string) {
    const limit = 1000;
    let page = 1;
    let assets = await getAssetsByGroup(collectionAddress, page, limit);
    const wallets: Set<string> = new Set();

    while (!isEmpty(assets)) {
      console.log(`Adding ${assets.length} assets in the array...!`);

      for (const asset of assets) {
        const ownerAddress = asset.ownership.owner;
        wallets.add(ownerAddress);
      }
      page++;
      assets = await getAssetsByGroup(collectionAddress, page, limit);
    }
    return Array.from(wallets);
  }
}
