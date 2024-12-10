import { PrismaService } from 'nestjs-prisma';
import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateWheelDto } from './dto/create-wheel.dto';
import { s3Service } from '../aws/s3.service';
import { appendTimestamp } from '../utils/helpers';
import { isNull, kebabCase } from 'lodash';
import { validateWheelDate } from '../utils/wheel';
import { AddRewardDto } from './dto/add-reward.dto';
import { addHours, subHours } from 'date-fns';
import { Drop, WheelReward, WheelRewardType } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { DigitalAssetService } from '../digital-asset/digital-asset.service';
import { Connection } from '@solana/web3.js';
import {
  getConnection,
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

const getS3Folder = (slug: string) => `wheel/${slug}/`;

@Injectable()
export class WheelService {
  private readonly connection: Connection;
  private readonly umi: Umi;
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly digitalAssetService: DigitalAssetService,
    private readonly s3: s3Service,
  ) {
    this.connection = getConnection();
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

    const imageKey = await this.s3.uploadFile(image, { s3Folder });
    const wheel = await this.prisma.wheel.create({
      data: { ...createWheelDto, image: imageKey, s3BucketSlug },
    });
    return wheel;
  }

  async addReward(wheelId: number, addRewardDto: AddRewardDto) {
    const wheel = await this.prisma.wheel.findUnique({where:{id:wheelId}});

    const s3Folder = getS3Folder(wheel.s3BucketSlug);
    const image = await this.s3.uploadFile(addRewardDto.image, { s3Folder });
    
    const reward = await this.prisma.wheelReward.create({
      data: {
        ...addRewardDto,
        image,
        wheel: {
          connect: { id: wheelId },
        },
      },
    });

    return reward;
  }

  // async removeReward(rewardId: number) {
  //   await this.prisma.wheelReward.update({
  //     where: { id: rewardId },
  //     data: { isActive: false },
  //   });
  // }

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
      include: {
        rewards: { include: { drops: { where: { isActive: true } } } },
      },
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
      { where: { createdAt: { gte: twentyFourHoursAgo }, userId } },
    );
    const isInCoolDownPeriod = !isNull(userLastWheelReceipt);

    if (isInCoolDownPeriod) {
      const nextSpinDate = addHours(userLastWheelReceipt.createdAt, 24);
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

    const winningSpin = Math.floor(1 + Math.random() * 100);
    if (winningSpin > 50) {
      return this.createReceiptForNoReward(wheelId, userId);
    }

    const availableRewards = wheel.rewards.filter(
      (reward) => reward.drops.length > 0,
    );
    const dropPool: { drop: Drop; rewardType: WheelRewardType }[] = [];
    //todo: check this algo
    availableRewards.forEach((reward) => {
      // Multiply supply by weight for its contribution
      reward.drops.forEach((drop) => {
        for (let i = 0; i < reward.weight; i++) {
          dropPool.push({ drop, rewardType: reward.type });
        }
      });
    });

    // select a drop on random.
    const { drop: selectedDrop, rewardType } =
      dropPool[Math.floor(Math.random() * dropPool.length)];

    const winningDrop = await this.prisma.$transaction(async (tx) => {
      const drop = await tx.drop.findUnique({
        where: { id: selectedDrop.id },
      });

      if (!drop.isActive) {
        return undefined;
      }

      const winningDrop = await tx.drop.update({
        where: { id: selectedDrop.id },
        data: { isActive: false },
      });

      return winningDrop;
    });

    if (!winningDrop) {
      return this.createReceiptForNoReward(wheelId, userId);
    }

    switch (rewardType) {
      case WheelRewardType.Physicals:
        return this.sendPhysicalClaimEmail(winningDrop, userId);
      case WheelRewardType.PrintEdition ||
        WheelRewardType.OneOfOne ||
        WheelRewardType.CollectibleComic:
        return this.transferCollectibleFromVault(
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
        return WheelRewardType.None;
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

  async sendPhysicalClaimEmail(winningDrop: Drop, userId: number) {
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
    winningDrop: Drop,
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

    //todo: check if amount needs to be in smallest unit or not .
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
    winningDrop: Drop,
    walletAddress: string,
    userId: number,
    rewardType: WheelRewardType,
  ) {
    const treasuryAddress = getTreasuryPublicKey();
    let ownerAddress: string;
    let collectionAddress: string;

    /** assetAddress */
    const address = winningDrop.itemId;
    if (rewardType == WheelRewardType.CollectibleComic) {
      const collectibleComic = await this.prisma.collectibleComic.findUnique({
        where: { address },
        include: {
          candyMachine: { include: { collection: true } },
          digitalAsset: true,
        },
      });
      collectionAddress = collectibleComic.candyMachine.collectionAddress;
      ownerAddress = collectibleComic.digitalAsset.ownerAddress;
    } else if (rewardType == WheelRewardType.PrintEdition) {
      const printEdition = await this.prisma.printEdition.findUnique({
        where: { address },
        include: { digitalAsset: true },
      });
      collectionAddress = printEdition.collectionAddress;
      ownerAddress = printEdition.digitalAsset.ownerAddress;
    } else {
      const oneOfOne = await this.prisma.oneOfOne.findUnique({
        where: { address },
        include: { digitalAsset: true },
      });
      collectionAddress = oneOfOne.collectionAddress;
      ownerAddress = oneOfOne.digitalAsset.ownerAddress;
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
}
