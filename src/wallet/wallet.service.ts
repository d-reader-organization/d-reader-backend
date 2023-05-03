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
import { Prisma } from '@prisma/client';
import axios from 'axios';
import {
  SAGA_COLLECTION_ADDRESS,
  SIGNED_TRAIT,
  USED_TRAIT,
} from '../constants';
import { initMetaplex } from '../utils/metaplex';

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

    if (referrer) await this.redeemReferral(address, referrer);

    if (name) {
      const exists = await this.prisma.wallet.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      });

      if (exists) {
        throw new NotFoundException(`Account with name ${name} already exists`);
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

  async updateFile(address: string, file: Express.Multer.File) {
    let wallet = await this.findOne(address);
    const oldFileKey = wallet[file.fieldname];
    const prefix = await this.getS3FilePrefix(address);
    const newFileKey = await this.s3.uploadFile(prefix, file);

    try {
      wallet = await this.prisma.wallet.update({
        where: { address },
        data: { [file.fieldname]: newFileKey },
      });
    } catch {
      await this.s3.deleteObject({ Key: newFileKey });
      throw new BadRequestException('Malformed file upload');
    }

    if (oldFileKey && oldFileKey !== newFileKey) {
      await this.s3.deleteObject({ Key: oldFileKey });
    }

    return wallet;
  }

  async remove(address: string) {
    // Remove s3 assets
    const prefix = await this.getS3FilePrefix(address);
    const keys = await this.s3.listFolderKeys({ Prefix: prefix });
    await this.s3.deleteObjects(keys);

    try {
      await this.prisma.wallet.delete({ where: { address } });
    } catch {
      throw new NotFoundException(
        `Wallet with address ${address} does not exist`,
      );
    }
    return;
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
    const where: Prisma.WalletWhereUniqueInput = isSolanaAddress(referrer)
      ? { address: referrer }
      : { name: referrer };
    const referrerWallet = await this.prisma.wallet.findUnique({
      where,
    });

    if (!referrerWallet) {
      throw new BadRequestException(`Account ${referrer} doesn't exist`);
    } else if (referrerWallet.referralsRemaining == 0) {
      throw new BadRequestException(
        `Account ${referrerWallet.name} doesn't have referrals left`,
      );
    }

    let wallet = await this.prisma.wallet.findUnique({
      where: { address: referee },
    });
    if (!!wallet.referredAt) {
      throw new BadRequestException(
        `Account ${wallet.name} is already referred`,
      );
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
      throw new BadRequestException(
        `No Saga Genesis Token found for wallet ${address}`,
      );
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
    const prefix = `wallets/${address}/`;
    return this.s3.uploadFile(prefix, file);
  }

  async getS3FilePrefix(address: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { address },
      select: { address: true },
    });

    if (!wallet) {
      throw new NotFoundException(
        `Wallet with address ${address} does not exist`,
      );
    }

    const prefix = `wallets/${wallet.address}/`;
    return prefix;
  }
}
