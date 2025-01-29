import { PrismaService } from 'nestjs-prisma';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateWheelDto } from './dto/create-wheel.dto';
import { s3Service } from '../aws/s3.service';
import { appendTimestamp } from '../utils/helpers';
import { isEqual, isNull, kebabCase } from 'lodash';
import { validateWalletBalance, validateWheelDate } from '../utils/wheel';
import { AddRewardDto } from './dto/add-reward.dto';
import {
  addHours,
  hoursToMilliseconds,
  minutesToMilliseconds,
  subDays,
  subHours,
  subMonths,
} from 'date-fns';
import {
  RewardDrop,
  WheelReward,
  WheelRewardReceipt,
  WheelRewardType,
  WheelType,
} from '@prisma/client';
import { MailService } from '../mail/mail.service';
import {
  getIdentityUmiSignature,
  getTreasuryPublicKey,
  getTreasuryUmiPublicKey,
  initUmi,
} from '../utils/metaplex';
import {
  setComputeUnitPrice,
  transferTokens,
  transferSol,
  findAssociatedTokenPda,
} from '@metaplex-foundation/mpl-toolbox';
import {
  createNoopSigner,
  lamports,
  publicKey,
  TransactionBuilder,
  Umi,
} from '@metaplex-foundation/umi';
import { MIN_COMPUTE_PRICE, SOL_ADDRESS } from 'src/constants';
import { base58 } from '@metaplex-foundation/umi/serializers';
import { fetchAssetV1, transfer } from '@metaplex-foundation/mpl-core';
import { AddDropsDto } from './dto/add-drops.dto';
import { RemoveDropsDto } from './dto/remove-drops.dto';
import { WheelInput } from './dto/wheel.dto';
import { UpdateRewardDto, UpdateWheelDto } from './dto/update.dto';
import { ERROR_MESSAGES } from '../utils/errors';
import { WheelReceiptInput } from './dto/wheel-receipt.dto';
import { WheelParams } from './dto/wheel-params.dto';
import { DigitalAssetService } from '../digital-asset/digital-asset.service';
import { WheelRewardHistoryInput } from './dto/wheel-reward-history.dto';
import { UserPayload } from 'src/auth/dto/authorization.dto';
import { WheelRewardHistoryParams } from './dto/wheel-history-params.dto';

const getS3Folder = (slug: string) => `wheel/${slug}/`;

@Injectable()
export class WheelService {
  private readonly umi: Umi;
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly s3: s3Service,
    private readonly digitalAssetService: DigitalAssetService,
  ) {
    this.umi = initUmi();
  }

  async create(createWheelDto: CreateWheelDto) {
    const { name, startsAt, expiresAt, winProbability, image } = createWheelDto;
    validateWheelDate(startsAt, expiresAt);

    if (winProbability <= 0 && winProbability >= 100) {
      throw new BadRequestException(ERROR_MESSAGES.WINNING_PROBABILITY);
    }

    const slug = kebabCase(name);
    const s3BucketSlug = appendTimestamp(slug);
    const s3Folder = getS3Folder(s3BucketSlug);

    const uploadedImage = image
      ? await this.s3.uploadFile(image, { s3Folder })
      : undefined;
    const wheel = await this.prisma.wheel.create({
      data: {
        ...createWheelDto,
        image: uploadedImage,
        s3BucketSlug,
        rewards: {
          create: {
            name: WheelRewardType.None,
            description: 'Rugged ! try your luck in your next spin.',
            type: WheelRewardType.None,
          },
        },
      },
    });
    return wheel;
  }

  async addReward(wheelId: number, addRewardDto: AddRewardDto) {
    const wheel = await this.prisma.wheel.findUnique({
      where: { id: wheelId },
    });
    if (!wheel) {
      throw new BadRequestException(ERROR_MESSAGES.WHEEL_NOT_EXISTS(wheelId));
    }

    const s3Folder = getS3Folder(wheel.s3BucketSlug);
    const { image, icon, drops } = addRewardDto;

    const uploadedImage = image
      ? await this.s3.uploadFile(image, { s3Folder })
      : undefined;
    const uploadedIcon = icon
      ? await this.s3.uploadFile(icon, { s3Folder })
      : undefined;

    const dropsData =
      drops?.map(({ amount, itemId }) => ({ amount, itemId })) || [];

    const reward = await this.prisma.wheelReward.create({
      data: {
        ...addRewardDto,
        image: uploadedImage,
        icon: uploadedIcon,
        wheel: { connect: { id: wheelId } },
        drops: { createMany: { data: dropsData } },
      },
    });

    return reward;
  }

  async addDrops(rewardId: number, addDropsDto: AddDropsDto) {
    const reward = await this.prisma.wheelReward.findUnique({
      where: { id: rewardId },
    });

    if (!reward) {
      throw new BadRequestException(ERROR_MESSAGES.REWARD_NOT_EXISTS(rewardId));
    }

    const dropsData = addDropsDto.drops.map((drop) => ({
      amount: drop.amount,
      itemId: drop.itemId,
      rewardId,
    }));

    await this.prisma.rewardDrop.createMany({
      data: dropsData,
    });
  }

  async removeDrops(rewardId: number, removeDropsDto: RemoveDropsDto) {
    const reward = await this.prisma.wheelReward.findUnique({
      where: { id: rewardId },
    });
    if (!reward) {
      throw new BadRequestException(ERROR_MESSAGES.REWARD_NOT_EXISTS(rewardId));
    }

    const dropsToDelete = removeDropsDto.drops;
    await this.prisma.rewardDrop.deleteMany({
      where: { id: { in: dropsToDelete } },
    });
  }

  async update(id: number, updateWheelDto: UpdateWheelDto) {
    const oldWheel = await this.prisma.wheel.findUnique({ where: { id } });
    if (!oldWheel) {
      throw new BadRequestException(ERROR_MESSAGES.WHEEL_NOT_EXISTS(id));
    }

    const { s3BucketSlug } = oldWheel;
    const s3Folder = getS3Folder(s3BucketSlug);

    const imageKey = updateWheelDto.image
      ? await this.s3.uploadFile(updateWheelDto.image, { s3Folder })
      : undefined;

    const wheel = await this.prisma.wheel.update({
      where: { id },
      data: {
        ...updateWheelDto,
        image: imageKey,
      },
    });
    return wheel;
  }

  async updateReward(id: number, updateRewardDto: UpdateRewardDto) {
    const oldReward = await this.prisma.wheelReward.findUnique({
      where: { id },
      include: { wheel: true },
    });

    if (!oldReward) {
      throw new BadRequestException(ERROR_MESSAGES.REWARD_NOT_EXISTS(id));
    }

    const { s3BucketSlug } = oldReward.wheel;
    const s3Folder = getS3Folder(s3BucketSlug);

    const { image, icon } = updateRewardDto;

    const uploadedImage = image
      ? await this.s3.uploadFile(image, { s3Folder })
      : undefined;
    const uploadedIcon = icon
      ? await this.s3.uploadFile(icon, { s3Folder })
      : undefined;

    const reward = await this.prisma.wheelReward.update({
      where: { id },
      data: {
        ...updateRewardDto,
        image: uploadedImage,
        icon: uploadedIcon,
      },
    });
    return reward;
  }

  async get(params: WheelParams, user?: UserPayload): Promise<WheelInput> {
    const wheel = await this.prisma.wheel.findFirst({
      where: { isActive: params.isActive || true },
      include: { rewards: true },
    });

    if (!wheel) {
      throw new NotFoundException(ERROR_MESSAGES.NO_ACTIVE_WHEELS_FOUND);
    }

    let nextSpinAt: Date;
    if (user) {
      const now = new Date();
      const lastEligibleSpinDate = subHours(now, 24);
      const userLastEligibleReceipt =
        await this.prisma.wheelRewardReceipt.findFirst({
          where: {
            createdAt: { gte: lastEligibleSpinDate },
            wheelId: wheel.id,
            userId: user.id,
          },
        });

      const isInCoolDownPeriod = !isNull(userLastEligibleReceipt);
      if (isInCoolDownPeriod) {
        //TODO: Change this if wheel is of different type
        nextSpinAt = addHours(userLastEligibleReceipt.createdAt, 24);
      } else {
        nextSpinAt = new Date();
      }
    }

    return { ...wheel, nextSpinAt };
  }

  async spin(wheelId: number, userId: number): Promise<WheelReceiptInput> {
    const lastConnectedWallet = await this.prisma.wallet.findFirst({
      where: { userId },
      orderBy: { connectedAt: 'desc' },
    });

    if (!lastConnectedWallet) {
      throw new BadRequestException(ERROR_MESSAGES.CONNECT_WALLET);
    }

    const walletAddress = lastConnectedWallet.address;
    const wheel = await this.prisma.wheel.findUnique({
      where: { id: wheelId },
      include: {
        rewards: { include: { drops: { where: { isActive: true } } } },
      },
    });

    if (!wheel) {
      throw new BadRequestException(ERROR_MESSAGES.WHEEL_NOT_EXISTS(wheelId));
    }

    const now = new Date();
    if (!wheel.isActive || wheel.startsAt > now) {
      throw new BadRequestException(ERROR_MESSAGES.WHEEL_NOT_ACTIVE);
    }

    if (wheel.expiresAt && wheel.expiresAt <= now) {
      throw new BadRequestException(ERROR_MESSAGES.WHEEL_EXPIRED);
    }

    let lastEligibleSpinDate: Date;
    switch (wheel.type) {
      case WheelType.Daily:
        lastEligibleSpinDate = subHours(now, 24);
        break;
      case WheelType.Weekly:
        lastEligibleSpinDate = subDays(now, 7);
        break;
      default:
        lastEligibleSpinDate = subMonths(now, 1);
    }

    const userLastEligibleReceipt =
      await this.prisma.wheelRewardReceipt.findFirst({
        where: { createdAt: { gte: lastEligibleSpinDate }, userId, wheelId },
      });
    const isInCoolDownPeriod = !isNull(userLastEligibleReceipt);

    if (isInCoolDownPeriod) {
      const cooldownPeriod = this.getSpinCooldownPeriod(
        userLastEligibleReceipt.createdAt,
      );

      throw new BadRequestException(
        ERROR_MESSAGES.NO_SPIN_LEFT(cooldownPeriod.join(' ')),
      );
    }

    const winningSpin = Math.floor(1 + Math.random() * 100);
    if (winningSpin > wheel.winProbability) {
      return this.createReceiptForNoReward(wheelId, userId);
    }

    const availableRewards = wheel.rewards.filter(
      (reward) => reward.drops.length > 0,
    );

    const dropPool: { drop: RewardDrop; rewardType: WheelRewardType }[] = [];
    availableRewards.forEach((reward) => {
      // Multiply by weight for its contribution
      reward.drops.forEach((drop) => {
        for (let i = 0; i < reward.weight; i++) {
          dropPool.push({ drop, rewardType: reward.type });
        }
      });
    });

    // select a drop on random.
    const randomlySelectedDrop =
      dropPool[Math.floor(Math.random() * dropPool.length)];

    if (!randomlySelectedDrop) {
      return this.createReceiptForNoReward(wheelId, userId);
    }

    const { drop: selectedDrop, rewardType } = randomlySelectedDrop;
    const winningDrop = await this.prisma.$transaction(async (tx) => {
      const drop = await tx.rewardDrop.findUnique({
        where: { id: selectedDrop.id },
      });

      if (!drop.isActive) {
        return undefined;
      }

      const winningDrop = await tx.rewardDrop.update({
        where: { id: selectedDrop.id, isActive: true },
        data: { isActive: false },
      });

      if (!winningDrop) {
        return undefined;
      }

      return winningDrop;
    });

    if (!winningDrop) {
      return this.createReceiptForNoReward(wheelId, userId);
    }

    switch (rewardType) {
      case WheelRewardType.Physical:
        return this.sendPhysicalClaimEmail(wheelId, winningDrop, userId);
      case WheelRewardType.PrintEdition:
      case WheelRewardType.OneOfOne:
      case WheelRewardType.CollectibleComic:
        return this.transferCollectibleFromVault(
          wheelId,
          winningDrop,
          walletAddress,
          userId,
          rewardType,
        );
      case WheelRewardType.Fungible:
        return this.transferFungibleFromVault(
          wheelId,
          winningDrop,
          walletAddress,
          userId,
        );
      default:
        return this.createReceiptForNoReward(wheelId, userId);
    }
  }

  async findWheelRewardHistory(
    params: WheelRewardHistoryParams,
  ): Promise<WheelRewardHistoryInput[]> {
    const { wheelId, skip, take } = params;

    const receipts = await this.prisma.wheelRewardReceipt.findMany({
      where: { wheelId },
      orderBy: { createdAt: 'desc' },
      include: {
        reward: true,
        user: true,
      },
      take,
      skip,
    });

    return receipts.map((receipt) => ({
      ...receipt,
      message: this.constructWheelRewardMessages(
        receipt.reward.type,
        receipt.dropName,
        receipt.amount,
      ),
    }));
  }

  constructWheelRewardMessages(
    rewardType: WheelRewardType,
    dropName: string,
    amount: number,
  ) {
    switch (rewardType) {
      case WheelRewardType.None: {
        return 'Nothing';
      }
      case WheelRewardType.CollectibleComic: {
        return `${dropName} comic`;
      }
      case WheelRewardType.Physical: {
        return dropName;
      }
      case WheelRewardType.Fungible: {
        return `${amount} ${dropName}`;
      }
      case WheelRewardType.PrintEdition: {
        return `${dropName} edition`;
      }
      case WheelRewardType.OneOfOne: {
        return `${dropName} 1 of 1 cover`;
      }
      default: 'Nothing';
    }
  }

  async createReceiptForNoReward(wheelId: number, userId: number) {
    const noReward = await this.prisma.wheelReward.findFirst({
      where: { wheelId, type: WheelRewardType.None },
    });

    const receipt = await this.prisma.wheelRewardReceipt.create({
      data: {
        user: { connect: { id: userId } },
        createdAt: new Date(),
        reward: { connect: { id: noReward.id } },
        wheel: { connect: { id: wheelId } },
        amount: 0,
        claimedAt: new Date(),
      },
    });

    const receiptInput: WheelReceiptInput = {
      ...receipt,
      reward: noReward,
    };

    return receiptInput;
  }

  async sendPhysicalClaimEmail(
    wheelId: number,
    winningDrop: RewardDrop,
    userId: number,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const physicalItem = await this.prisma.physicalItem.findUnique({
      where: { id: winningDrop.itemId },
    });

    if (!physicalItem) {
      console.log(`Physical drop Item not found`);
      return this.createReceiptForNoReward(wheelId, userId);
    }

    await this.mailService.claimPhysicalDrop(physicalItem, user);
    const receipt = await this.prisma.wheelRewardReceipt.create({
      include: { reward: true },
      data: {
        dropId: winningDrop.id,
        user: { connect: { id: userId } },
        wheel: { connect: { id: wheelId } },
        createdAt: new Date(),
        dropName: physicalItem.name,
        amount: winningDrop.amount,
        reward: { connect: { id: winningDrop.rewardId } },
      },
    });

    const receiptInput: WheelReceiptInput = {
      ...receipt,
      reward: receipt.reward,
      physicalDrop: {
        ...winningDrop,
        physical: physicalItem,
      },
    };

    return receiptInput;
  }

  async transferFungibleFromVault(
    wheelId: number,
    winningDrop: RewardDrop,
    walletAddress: string,
    userId: number,
  ) {
    const splToken = await this.prisma.splToken.findUnique({
      where: { address: winningDrop.itemId },
    });

    if (!splToken) {
      console.log(`Spl token drop Item not found ${winningDrop.itemId}`);
      return this.createReceiptForNoReward(wheelId, userId);
    }

    const amount = winningDrop.amount;
    const isSol = splToken.address === SOL_ADDRESS;

    let builder = setComputeUnitPrice(this.umi, {
      microLamports: MIN_COMPUTE_PRICE,
    });
    const treasuryPublicKey = getTreasuryUmiPublicKey();
    const signer = createNoopSigner(treasuryPublicKey);
    const destination = publicKey(walletAddress);

    const isBalanceEnough = await validateWalletBalance(
      this.umi,
      walletAddress,
      amount,
      splToken.address,
    );
    if (!isBalanceEnough) {
      console.log(
        `Vault doesn't have enough balance for fungible drop ${splToken.address}`,
      );
      return this.createReceiptForNoReward(wheelId, userId);
    }

    let transferBuilder: TransactionBuilder;
    if (isSol) {
      transferBuilder = transferSol(this.umi, {
        source: signer,
        destination,
        amount: lamports(amount),
      });
    } else {
      const mint = publicKey(splToken.address);
      const destinationAta = findAssociatedTokenPda(this.umi, {
        mint,
        owner: destination,
      });
      transferBuilder = transferTokens(this.umi, {
        source: treasuryPublicKey,
        destination: destinationAta,
        amount,
      });
    }

    builder = builder.add(transferBuilder);
    const transaction = await builder.buildAndSign({
      ...this.umi,
      payer: signer,
    });
    const signedTransaction = await getIdentityUmiSignature(transaction);

    const latestBlockHash = await this.umi.rpc.getLatestBlockhash({
      commitment: 'confirmed',
    });
    const signature = await this.umi.rpc.sendTransaction(signedTransaction, {
      skipPreflight: true,
    });
    const transactionSignature = base58.deserialize(signature)[0];

    await this.umi.rpc.confirmTransaction(signature, {
      commitment: 'confirmed',
      strategy: { type: 'blockhash', ...latestBlockHash },
    });
    const receipt = await this.prisma.wheelRewardReceipt.create({
      include: { reward: true },
      data: {
        transactionSignature,
        dropId: winningDrop.id,
        wallet: { connect: { address: walletAddress } },
        user: { connect: { id: userId } },
        wheel: { connect: { id: wheelId } },
        createdAt: new Date(),
        claimedAt: new Date(),
        amount: winningDrop.amount,
        dropName: splToken.symbol,
        reward: { connect: { id: winningDrop.rewardId } },
      },
    });

    const receiptInput: WheelReceiptInput = {
      ...receipt,
      reward: receipt.reward,
      fungibleDrop: {
        ...winningDrop,
        fungible: splToken,
      },
    };

    return receiptInput;
  }

  async transferCollectibleFromVault(
    wheelId: number,
    winningDrop: RewardDrop,
    walletAddress: string,
    userId: number,
    rewardType: WheelRewardType,
  ) {
    const treasuryAddress = getTreasuryPublicKey();
    const address = winningDrop.itemId;
    const asset = await fetchAssetV1(this.umi, publicKey(address));
    const owner = asset.owner;
    const vault = getTreasuryUmiPublicKey();

    if (!isEqual(owner, vault)) {
      const walletAddress = owner.toString();

      await this.prisma.digitalAsset.update({
        where: { address },
        data: {
          owner: {
            connectOrCreate: {
              where: { address: walletAddress },
              create: { address: walletAddress },
            },
          },
          ownerChangedAt: new Date(),
        },
      });

      return this.createReceiptForNoReward(wheelId, userId);
    }

    const collectionAddress =
      asset.updateAuthority.type === 'Collection'
        ? asset.updateAuthority.address
        : undefined;

    let builder = setComputeUnitPrice(this.umi, {
      microLamports: MIN_COMPUTE_PRICE,
    });
    builder = builder.add(
      transfer(this.umi, {
        asset: {
          publicKey: publicKey(address),
          owner: publicKey(treasuryAddress),
        },
        collection: { publicKey: collectionAddress },
        newOwner: publicKey(walletAddress),
      }),
    );

    const treasuryPublicKey = getTreasuryUmiPublicKey();
    const signer = createNoopSigner(treasuryPublicKey);
    const transaction = await builder.buildAndSign({
      ...this.umi,
      payer: signer,
    });

    const signedTransaction = await getIdentityUmiSignature(transaction);
    const latestBlockHash = await this.umi.rpc.getLatestBlockhash({
      commitment: 'confirmed',
    });
    const signature = await this.umi.rpc.sendTransaction(signedTransaction, {
      skipPreflight: true,
    });

    const transactionSignature = base58.deserialize(signature)[0];
    await this.umi.rpc.confirmTransaction(signature, {
      commitment: 'confirmed',
      strategy: { type: 'blockhash', ...latestBlockHash },
    });

    const receipt = await this.prisma.wheelRewardReceipt.create({
      include: { reward: true },
      data: {
        transactionSignature,
        dropId: winningDrop.id,
        wallet: { connect: { address: walletAddress } },
        user: { connect: { id: userId } },
        wheel: { connect: { id: wheelId } },
        createdAt: new Date(),
        claimedAt: new Date(),
        dropName: asset.name,
        amount: winningDrop.amount,
        reward: { connect: { id: winningDrop.rewardId } },
      },
    });
    await this.prisma.digitalAsset.update({
      where: { address },
      data: {
        owner: {
          connect: { address: walletAddress },
        },
        ownerChangedAt: new Date(),
      },
    });

    if (rewardType == WheelRewardType.CollectibleComic) {
      return this.createCollectibleComicDropReceipt(receipt, winningDrop);
    } else if (rewardType == WheelRewardType.PrintEdition) {
      return this.createPrintEditionDropReceipt(receipt, winningDrop);
    } else {
      return this.createOneOfOneDropReceipt(receipt, winningDrop);
    }
  }

  async createCollectibleComicDropReceipt(
    receipt: WheelRewardReceipt & { reward: WheelReward },
    winningDrop: RewardDrop,
  ) {
    const collectibleComic =
      await this.digitalAssetService.findOneCollectibleComic(
        winningDrop.itemId,
      );

    const receiptInput: WheelReceiptInput = {
      ...receipt,
      reward: receipt.reward,
      collectibleComicDrop: {
        ...winningDrop,
        collectibleComic,
      },
    };
    return receiptInput;
  }

  async createPrintEditionDropReceipt(
    receipt: WheelRewardReceipt & { reward: WheelReward },
    winningDrop: RewardDrop,
  ) {
    const printEdition = await this.digitalAssetService.findOnePrintEdition(
      winningDrop.itemId,
    );

    const receiptInput: WheelReceiptInput = {
      ...receipt,
      reward: receipt.reward,
      printEditionDrop: {
        ...winningDrop,
        printEdition,
      },
    };
    return receiptInput;
  }

  async createOneOfOneDropReceipt(
    receipt: WheelRewardReceipt & { reward: WheelReward },
    winningDrop: RewardDrop,
  ) {
    const oneOfOne = await this.digitalAssetService.findSingleOneOfOne(
      winningDrop.itemId,
    );

    const receiptInput: WheelReceiptInput = {
      ...receipt,
      reward: receipt.reward,
      oneOfOneDrop: {
        ...winningDrop,
        oneOfOne,
      },
    };
    return receiptInput;
  }

  getSpinCooldownPeriod(lastSpunAt: Date) {
    const now = new Date();
    const dayInMs = hoursToMilliseconds(24);
    const hourInMs = hoursToMilliseconds(1);
    const minuteInMs = minutesToMilliseconds(1);

    const nextSpinDate = addHours(lastSpunAt, 24);
    const timeDiff = nextSpinDate.getTime() - now.getTime();
    const days = Math.floor(timeDiff / dayInMs);
    const hours = Math.floor(timeDiff / hourInMs);
    const minutes = Math.floor((timeDiff % hourInMs) / minuteInMs);
    const seconds = Math.floor((timeDiff % minuteInMs) / 1000);

    // TODO: use helper functions similar to the ones we have on frontend
    // calculateRemaningSeconds() and formatTime()
    // date-fns library also has helper functions to convert remaining time to a human readable format
    const cooldownPeriod = [];
    if (days > 0) {
      cooldownPeriod.push(`${days} day${days > 1 ? 's' : ''}`);
    }
    if (hours > 0) {
      cooldownPeriod.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    }
    if (minutes > 0) {
      cooldownPeriod.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
    }
    if (seconds > 0) {
      cooldownPeriod.push(`${seconds} second${seconds > 1 ? 's' : ''}`);
    }

    return cooldownPeriod;
  }
}
