import { PrismaService } from 'nestjs-prisma';
import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateWheelDto } from './dto/create-wheel.dto';
import { s3Service } from '../aws/s3.service';
import { appendTimestamp } from '../utils/helpers';
import { isNull, kebabCase } from 'lodash';
import { validateWheelDate } from '../utils/wheel';
import { AddRewardDto } from './dto/add-reward.dto';
import {
  addHours,
  hoursToMilliseconds,
  minutesToMilliseconds,
  subDays,
  subHours,
  subMonths,
} from 'date-fns';
import { RewardDrop, WheelRewardType, WheelType } from '@prisma/client';
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
import { transfer } from '@metaplex-foundation/mpl-core';
import { AddDropsDto } from './dto/add-drops.dto';
import { RemoveDropsDto } from './dto/remove-drops.dto';
import { WheelInput } from './dto/wheel.dto';
import { UpdateRewardDto, UpdateWheelDto } from './dto/update.dto';

const getS3Folder = (slug: string) => `wheel/${slug}/`;

@Injectable()
export class WheelService {
  private readonly umi: Umi;
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly s3: s3Service,
  ) {
    this.umi = initUmi();
  }

  async create(createWheelDto: CreateWheelDto) {
    const { name, startsAt, expiresAt, winProbability, image } = createWheelDto;
    validateWheelDate(startsAt, expiresAt);

    if (winProbability <= 0 && winProbability >= 100) {
      throw new BadRequestException(
        'Winning probability should be between 1-99',
      );
    }

    const slug = kebabCase(name);
    const s3BucketSlug = appendTimestamp(slug);
    const s3Folder = getS3Folder(s3BucketSlug);

    const imageKey = image
      ? await this.s3.uploadFile(image, { s3Folder })
      : undefined;

    const wheel = await this.prisma.wheel.create({
      data: {
        ...createWheelDto,
        image: imageKey,
        s3BucketSlug,
        rewards: {
          create: {
            name: 'Nothing',
            description: 'Rugged ! try your luck in your next spin.',
            type: 'None',
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

    const s3Folder = getS3Folder(wheel.s3BucketSlug);
    const image = addRewardDto.image
      ? await this.s3.uploadFile(addRewardDto.image, { s3Folder })
      : undefined;
    const dropsData = addRewardDto.drops?.map((drop) => ({
      amount: drop.amount,
      itemId: drop.itemId,
    }));

    const reward = await this.prisma.wheelReward.create({
      data: {
        ...addRewardDto,
        image,
        wheel: { connect: { id: wheelId } },
        drops: { createMany: { data: dropsData || [] } },
      },
    });

    return reward;
  }

  async addDrops(rewardId: number, addDropsDto: AddDropsDto) {
    const reward = await this.prisma.wheelReward.findUnique({
      where: { id: rewardId },
    });
    if (!reward) {
      throw new BadRequestException(
        `Reward with id ${rewardId} does not exists`,
      );
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
      throw new BadRequestException(
        `Reward with id ${rewardId} does not exists`,
      );
    }

    const dropsToDelete = removeDropsDto.drops;
    await this.prisma.rewardDrop.deleteMany({
      where: { id: { in: dropsToDelete } },
    });
  }

  async update(id: number, updateWheelDto: UpdateWheelDto) {
    const oldWheel = await this.prisma.wheel.findUnique({ where: { id } });

    if (!oldWheel) {
      throw new BadRequestException(`Wheel with id ${id} doesn't exists`);
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
      throw new BadRequestException(`Reward with id ${id} doesn't exists`);
    }

    const { s3BucketSlug } = oldReward.wheel;
    const s3Folder = getS3Folder(s3BucketSlug);

    const imageKey = updateRewardDto.image
      ? await this.s3.uploadFile(updateRewardDto.image, { s3Folder })
      : undefined;

    const reward = await this.prisma.wheelReward.update({
      where: { id },
      data: {
        ...updateRewardDto,
        image: imageKey,
      },
    });
    return reward;
  }

  async get(id: number): Promise<WheelInput> {
    const wheel = await this.prisma.wheel.findUnique({
      where: { id },
      include: { rewards: true },
    });
    return wheel;
  }

  async spin(wheelId: number, userId: number) {
    const lastConnectedWallet = await this.prisma.wallet.findFirst({
      where: { userId },
      orderBy: { connectedAt: 'desc' },
    });

    if (!lastConnectedWallet) {
      throw new BadRequestException(
        'Please connect wallet to be able to claim digital rewards !',
      );
    }

    const walletAddress = lastConnectedWallet.address;
    const wheel = await this.prisma.wheel.findUnique({
      where: { id: wheelId },
      include: {
        rewards: { include: { drops: { where: { isActive: true } } } },
      },
    });
    const now = new Date();
    if (!wheel.isActive || wheel.startsAt > now) {
      throw new BadRequestException('Wheel is not active !');
    }

    if (wheel.expiresAt && wheel.expiresAt <= now) {
      throw new BadRequestException('Wheel has been expired !');
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

    const userLastWheelReceipt = await this.prisma.wheelRewardReceipt.findFirst(
      { where: { createdAt: { gte: lastEligibleSpinDate }, userId } },
    );
    const isInCoolDownPeriod = !isNull(userLastWheelReceipt);

    if (isInCoolDownPeriod) {
      const dayInMs = hoursToMilliseconds(24);
      const hourInMs = hoursToMilliseconds(1);
      const minuteInMs = minutesToMilliseconds(1);

      const nextSpinDate = addHours(userLastWheelReceipt.createdAt, 24);
      const timeDiff = nextSpinDate.getTime() - now.getTime();
      const days = Math.floor(timeDiff / dayInMs);
      const hours = Math.floor(timeDiff / hourInMs);
      const minutes = Math.floor((timeDiff % hourInMs) / minuteInMs);
      const seconds = Math.floor((timeDiff % minuteInMs) / 1000);

      const cooldownMessage = [];
      if (days > 0) {
        cooldownMessage.push(`${days} day${days > 1 ? 's' : ''}`);
      }
      if (hours > 0) {
        cooldownMessage.push(`${hours} hour${hours > 1 ? 's' : ''}`);
      }
      if (minutes > 0) {
        cooldownMessage.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
      }
      if (seconds > 0) {
        cooldownMessage.push(`${seconds} second${seconds > 1 ? 's' : ''}`);
      }

      throw new BadRequestException(
        `You don't have any spin left, spin again in ${cooldownMessage.join(
          ' ',
        )}`,
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
      case WheelRewardType.Physicals:
        return this.sendPhysicalClaimEmail(winningDrop, userId);
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
      case WheelRewardType.Fungibles:
        return this.transferFungibleFromVault(
          winningDrop,
          walletAddress,
          userId,
        );
      default:
        return this.createReceiptForNoReward(wheelId, userId);
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
      },
    });

    return receipt;
  }

  async sendPhysicalClaimEmail(winningDrop: RewardDrop, userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const physicalItem = await this.prisma.physicalItem.findUnique({
      where: { id: winningDrop.itemId },
    });
    await this.mailService.claimPhysicalDrop(physicalItem, user);
    const receipt = await this.prisma.wheelRewardReceipt.create({
      data: {
        dropId: winningDrop.id,
        user: { connect: { id: userId } },
        createdAt: new Date(),
        reward: { connect: { id: winningDrop.rewardId } },
      },
    });

    return receipt;
  }

  async transferFungibleFromVault(
    winningDrop: RewardDrop,
    walletAddress: string,
    userId: number,
  ) {
    const splToken = await this.prisma.splToken.findUnique({
      where: { address: winningDrop.itemId },
    });
    const amount = winningDrop.amount;

    const isSol = splToken.address === SOL_ADDRESS;

    let builder = setComputeUnitPrice(this.umi, {
      microLamports: MIN_COMPUTE_PRICE,
    });
    const treasuryPublicKey = getTreasuryUmiPublicKey();
    const signer = createNoopSigner(treasuryPublicKey);
    const destination = publicKey(walletAddress);

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
      data: {
        transactionSignature,
        dropId: winningDrop.id,
        wallet: { connect: { address: walletAddress } },
        user: { connect: { id: userId } },
        createdAt: new Date(),
        claimedAt: new Date(),
        reward: { connect: { id: winningDrop.rewardId } },
      },
    });

    return receipt;
  }

  async transferCollectibleFromVault(
    wheelId: number,
    winningDrop: RewardDrop,
    walletAddress: string,
    userId: number,
    rewardType: WheelRewardType,
  ) {
    const treasuryAddress = getTreasuryPublicKey();
    /** assetAddress */
    const address = winningDrop.itemId;
    const collectionAddress = await this.fetchCollectionAddress(
      rewardType,
      address,
    );
    if (!collectionAddress) {
      return this.createReceiptForNoReward(wheelId, userId);
    }

    let builder = setComputeUnitPrice(this.umi, {
      microLamports: MIN_COMPUTE_PRICE,
    });
    builder = builder.add(
      transfer(this.umi, {
        asset: {
          publicKey: publicKey(address),
          owner: publicKey(treasuryAddress),
        },
        collection: { publicKey: publicKey(collectionAddress) },
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
      data: {
        transactionSignature,
        dropId: winningDrop.id,
        wallet: { connect: { address: walletAddress } },
        user: { connect: { id: userId } },
        createdAt: new Date(),
        claimedAt: new Date(),
        reward: { connect: { id: winningDrop.rewardId } },
      },
    });

    return receipt;
  }

  async fetchCollectionAddress(rewardType: WheelRewardType, address: string) {
    switch (rewardType) {
      case WheelRewardType.CollectibleComic: {
        const collectible = await this.prisma.collectibleComic.findUnique({
          where: { address },
          include: { candyMachine: { include: { collection: true } } },
        });

        return collectible ? collectible.candyMachine?.collectionAddress : null;
      }
      case WheelRewardType.PrintEdition: {
        const collectible = await this.prisma.printEdition.findUnique({
          where: { address },
        });

        return collectible ? collectible.collectionAddress : null;
      }
      case WheelRewardType.PrintEdition: {
        const collectible = await this.prisma.oneOfOne.findUnique({
          where: { address },
          include: { digitalAsset: true },
        });

        return collectible ? collectible.collectionAddress : null;
      }
      default:
        return null;
    }
  }
}
