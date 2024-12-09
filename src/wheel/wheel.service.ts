import { PrismaService } from 'nestjs-prisma';
import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateWheelDto } from './dto/create-wheel.dto';
import { s3Service } from '../aws/s3.service';
import { appendTimestamp } from '../utils/helpers';
import { isNull, kebabCase } from 'lodash';
import { validateWheelDate } from '../utils/wheel';
import { AddRewardDto } from './dto/add-reward.dto';
import { addHours, subHours } from 'date-fns';
import { WheelReward, WheelRewardType } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { DigitalAssetService } from '../digital-asset/digital-asset.service';
import { Connection } from '@solana/web3.js';
import { getConnection, getTreasuryPublicKey } from '../utils/metaplex';

const getS3Folder = (slug: string) => `wheel/${slug}/`;

@Injectable()
export class WheelService {
  private readonly connection: Connection;
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly digitalAssetService: DigitalAssetService,
    private readonly s3: s3Service,
  ) {
    this.connection = getConnection();
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

    const imageKey = await this.s3.uploadFile(image, { s3Folder });
    const wheel = await this.prisma.wheel.create({
      data: { ...createWheelDto, image: imageKey, s3BucketSlug },
    });
    return wheel;
  }

  async addReward(wheelId: number, addRewardDto: AddRewardDto) {
    const reward = await this.prisma.wheelReward.create({
      data: {
        ...addRewardDto,
        wheel: {
          connect: { id: wheelId },
        },
      },
    });

    return reward;
  }

  async removeReward(rewardId: number) {
    await this.prisma.wheelReward.update({
      where: { id: rewardId },
      data: { isActive: false },
    });
  }

  async update() {}
  async updateReward() {}
  async get(id: number) {
    const wheel = await this.prisma.wheel.findUnique({
      where: { id },
      include: { rewards: true },
    });
    return wheel;
  }
  async spin(wheelId: number, userId: number, walletAddress: string) {
    const wheel = await this.prisma.wheel.findUnique({
      where: { id: wheelId },
      include: { rewards: true },
    });
    const now = new Date();
    if (!wheel.isActive || wheel.startsAt > now) {
      throw new BadRequestException('Wheel is not active !');
    }

    if (wheel.expiresAt <= now) {
      throw new BadRequestException('Wheel has been expired !');
    }

    const twentyFourHoursAgo = subHours(now, 24);
    const userLastWheelReceipt = await this.prisma.wheelRewardReceipt.findFirst(
      { where: { timestamp: { gte: twentyFourHoursAgo }, userId } },
    );
    const isInCoolDownPeriod = !isNull(userLastWheelReceipt);

    if (isInCoolDownPeriod) {
      const nextSpinDate = addHours(userLastWheelReceipt.timestamp, 24);
      const timeDiff = nextSpinDate.getTime() - now.getTime();
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

      let formattedCoolDown = '';
      if (hours > 0) {
        formattedCoolDown = `${hours} hour${hours > 1 ? 's' : ''}`;
      } else if (minutes > 0) {
        formattedCoolDown = `${minutes} minute${minutes > 1 ? 's' : ''}`;
      } else {
        formattedCoolDown = `${seconds} second${seconds > 1 ? 's' : ''}`;
      }
      throw new BadRequestException(
        `You don't have any spin left, spin again in ${formattedCoolDown}`,
      );
    }

    const winningSpin = Math.random() * 100;
    if (winningSpin > 50) {
      return WheelRewardType.None;
    }

    const availableRewards = wheel.rewards.filter(
      (reward) => reward.supply > 0,
    );
    const rewardPool: WheelReward[] = [];
    availableRewards.forEach((reward) => {
      // Multiply supply by weight for its contribution
      const weightedCount = reward.supply * reward.weight;
      for (let i = 0; i < weightedCount; i++) {
        rewardPool.push(reward);
      }
    });

    // select a reward on random.
    const selectedReward =
      rewardPool[Math.floor(Math.random() * rewardPool.length)];
    const winningReward = await this.prisma.$transaction(async (tx) => {
      const reward = await tx.wheelReward.findUnique({
        where: { id: selectedReward.id },
      });

      if (reward.supply <= 0) {
        return undefined;
      }

      const updatedReward = await tx.wheelReward.update({
        where: { id: selectedReward.id },
        data: {
          supply: {
            decrement: 1,
          },
        },
      });

      return updatedReward;
    });

    if (!winningReward) {
      return WheelRewardType.None;
    }

    //todo: create reward receipt
    const typeId = selectedReward.typeId;
    switch (selectedReward.type) {
      case WheelRewardType.CnftDrop:
        return this.mintCoverDrop(typeId, walletAddress);
      case WheelRewardType.Physicals:
        return this.sendPhysicalClaimEmail(typeId, userId);
      case WheelRewardType.PrintEdition:
        return this.mintPrintEdition(typeId, walletAddress);
      case WheelRewardType.OneOfOne:
        return this.transferOneOfOne(typeId, walletAddress);
      case WheelRewardType.CollectibleComic:
        return this.transferCollectibleComic(typeId, walletAddress);
      default:
        return WheelRewardType.None;
    }
  }

  async mintCoverDrop(id: string, winnerAddress: string) {
    const dropData = await this.prisma.coverDrop.findUnique({
      where: { id: +id },
    });
    //todo: mint a cnft
  }

  async sendPhysicalClaimEmail(id: string, userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const physicalDrop = await this.prisma.physicalDrop.findUnique({
      where: { id: +id },
    });
    await this.mailService.claimPhysicalDrop(physicalDrop, user);
    return physicalDrop;
  }

  async mintPrintEdition(collectionAddress: string, winnerAddress: string) {
    const transaction =
      await this.digitalAssetService.createBuyPrintEditionTransaction({
        masterEditionAddress: collectionAddress,
        buyer: winnerAddress,
      });
    const signature = await this.connection.sendEncodedTransaction(
      transaction,
      { skipPreflight: true },
    );
    const printEdition = await this.prisma.printEdition.findUnique({
      where: { address: collectionAddress },
    });
    return printEdition;
  }

  async transferOneOfOne(collectionAddress: string, winnerAddress: string) {
    const treasuryAddress = getTreasuryPublicKey();
    const oneOfOne = await this.prisma.oneOfOne.findFirst({
      where: {
        collectionAddress,
        digitalAsset: { ownerAddress: treasuryAddress.toString() },
      },
    });
    //todo: transfer to winnerAddress
    return oneOfOne;
  }

  async transferCollectibleComic(
    collectionAddress: string,
    winnerAddress: string,
  ) {
    const treasuryAddress = getTreasuryPublicKey();
    //todo: should we specify a certain rarity and metadata ?
    const collectibleComic = await this.prisma.collectibleComic.findFirst({
      where: {
        candyMachine: { collectionAddress },
        digitalAsset: { ownerAddress: treasuryAddress.toString() },
      },
    });
    //todo: transfer to winnerAddress
    return collectibleComic;
  }
}
