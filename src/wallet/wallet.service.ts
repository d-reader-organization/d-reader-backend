import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import * as jdenticon from 'jdenticon';
import { s3Service } from '../aws/s3.service';
import { JsonMetadata, Metaplex } from '@metaplex-foundation/js';
import { PublicKey } from '@solana/web3.js';
import { isSolanaAddress } from '../decorators/IsSolanaAddress';
import { Wallet } from '@prisma/client';
import axios from 'axios';
import {
  SAGA_COLLECTION_ADDRESS,
  SIGNED_TRAIT,
  USED_TRAIT,
} from '../constants';
import { initMetaplex } from '../utils/metaplex';
import { PickFields } from '../types/shared';

const getS3Folder = (address: string) => `wallets/${address}/`;
type WalletFileProperty = PickFields<Wallet, 'avatar'>;

@Injectable()
export class WalletService {
  private readonly metaplex: Metaplex;

  constructor(
    private readonly s3: s3Service,
    private readonly prisma: PrismaService,
  ) {
    this.metaplex = initMetaplex();
  }

  async syncWallet(address: string) {
    const onChainNfts = await this.metaplex
      .nfts()
      .findAllByOwner({ owner: new PublicKey(address) });

    const wallet = await this.prisma.wallet.findUnique({
      where: { address: address.toString() },
      include: { nfts: true },
    });

    const candyMachines = await this.prisma.candyMachine.findMany({
      select: { address: true },
    });

    const unsyncedNfts = onChainNfts.filter(
      (nft) =>
        nft.creators.length > 1 &&
        candyMachines.find(
          (cm) => cm.address === nft.creators[1].address.toString(),
        ) &&
        !wallet.nfts.find((nft) => nft.address === nft.address.toString()),
    );

    // TODO: pLimit here as to not overload db with parallel connections
    const walletSync = unsyncedNfts.map(async (nft) => {
      const { data: collectionMetadata } = await axios.get<JsonMetadata>(
        nft.uri,
      );
      const usedTrait = collectionMetadata.attributes.find(
        (a) => a.trait_type === USED_TRAIT,
      );
      const signedTrait = collectionMetadata.attributes.find(
        (a) => a.trait_type === SIGNED_TRAIT,
      );
      return this.prisma.nft.create({
        data: {
          address: nft.address.toString(),
          name: nft.name,
          metadata: {
            connectOrCreate: {
              where: { uri: nft.uri },
              create: {
                collectionName: collectionMetadata.collection.name,
                uri: nft.uri,
                isUsed: usedTrait.value === 'true',
                isSigned: signedTrait.value === 'true',
              },
            },
          },
          owner: {
            connectOrCreate: {
              where: { address: wallet.address },
              create: { address: wallet.address, name: wallet.address },
            },
          },
          candyMachine: {
            connect: { address: nft.creators[1].address.toString() },
          },
          collectionNft: {
            connect: { address: nft.collection.address.toString() },
          },
        },
      });
    });
    await Promise.all(walletSync);
  }

  async findAll() {
    const wallets = await this.prisma.wallet.findMany();
    return wallets;
  }

  async findMe(address: string) {
    const wallet = await this.prisma.wallet.update({
      where: { address },
      data: { lastActiveAt: new Date() },
    });
    return wallet;
  }

  async findOne(address: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { address },
      // include: { creator: true },
    });

    if (!wallet) {
      throw new NotFoundException(
        `Wallet with address ${address} does not exist`,
      );
    }

    return wallet;
  }

  async findMyAssets(address: string) {
    const nfts = await this.prisma.nft.findMany({
      where: { ownerAddress: address },
      orderBy: { name: 'asc' },
    });

    return nfts;
  }

  async update(address: string, updateWalletDto: UpdateWalletDto) {
    const { referrer, name } = updateWalletDto;

    if (referrer) await this.redeemReferral(referrer, address);

    if (name) {
      const exists = await this.prisma.wallet.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      });

      if (exists) {
        throw new NotFoundException(`'${name}' already taken`);
      }

      try {
        const updatedWallet = await this.prisma.wallet.update({
          where: { address },
          data: { name },
        });

        return updatedWallet;
      } catch {
        throw new NotFoundException(
          `Wallet with address ${address} does not exist`,
        );
      }
    }
  }

  async updateFile(
    address: string,
    file: Express.Multer.File,
    field: WalletFileProperty,
  ) {
    let wallet = await this.findOne(address);

    const s3Folder = getS3Folder(address);
    const oldFileKey = wallet[field];
    const newFileKey = await this.s3.uploadFile(s3Folder, file, field);

    try {
      wallet = await this.prisma.wallet.update({
        where: { address },
        data: { [field]: newFileKey },
      });
    } catch {
      await this.s3.deleteObject(newFileKey);
      throw new BadRequestException('Malformed file upload');
    }

    if (oldFileKey && oldFileKey !== newFileKey) {
      await this.s3.deleteObject(oldFileKey);
    }

    return wallet;
  }

  async redeemReferral(referrer: string, referee: string) {
    if (!referrer) {
      throw new BadRequestException('Referrer username or address not defined');
    } else if (!referee) {
      throw new BadRequestException('Referee address missing');
    } else if (referrer.toLowerCase() === 'saga') {
      await this.validateSagaUser(referee);
      referrer = 'Saga';
    }

    // if the search string is of type Solana address, search by address
    // otherwise search by wallet name
    let referrerWallet: Wallet;
    if (isSolanaAddress(referrer)) {
      referrerWallet = await this.prisma.wallet.findUnique({
        where: { address: referrer },
      });
    } else {
      referrerWallet = await this.prisma.wallet.findUnique({
        where: { name: referrer },
      });
    }

    if (!referrerWallet) {
      throw new BadRequestException(`User ${referrer} doesn't exist`);
    } else if (referrerWallet.referralsRemaining == 0) {
      throw new BadRequestException(
        `User ${referrerWallet.name} doesn't have referrals left`,
      );
    } else if (referrerWallet.address === referee) {
      throw new BadRequestException('Cannot refer yourself');
    }

    let wallet = await this.prisma.wallet.findUnique({
      where: { address: referee },
    });
    if (!!wallet.referredAt) {
      throw new BadRequestException(`User ${wallet.name} is already referred`);
    }

    // update referrer wallet
    await this.prisma.wallet.update({
      where: { address: referee },
      data: {
        referredAt: new Date(),
        referrer: {
          connect: { address: referrerWallet.address },
          update: { referralsRemaining: { decrement: 1 } },
        },
      },
    });

    // refresh referred wallet state
    wallet = await this.prisma.wallet.findUnique({
      where: { address: referee },
    });

    return wallet;
  }

  async validateSagaUser(address: string) {
    const nfts = await this.metaplex
      .nfts()
      .findAllByOwner({ owner: new PublicKey(address) });
    const sagaToken = nfts.find(
      (nft) =>
        nft.collection &&
        nft.collection.address.toString() === SAGA_COLLECTION_ADDRESS &&
        nft.collection.verified,
    );
    if (!sagaToken) {
      throw new BadRequestException('Saga Genesis Token not found');
    }
  }

  async generateAvatar(address: string) {
    const buffer = jdenticon.toPng(address, 200);
    const file = {
      fieldname: 'avatar.png',
      originalname: 'icon',
      mimetype: 'image/png',
      buffer,
    };
    const s3Folder = getS3Folder(address);
    return this.s3.uploadFile(s3Folder, file, 'avatar');
  }
}
