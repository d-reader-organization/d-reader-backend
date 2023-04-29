import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import * as jdenticon from 'jdenticon';
import { s3Service } from '../aws/s3.service';
import { Metaplex, keypairIdentity } from '@metaplex-foundation/js';
import { Cluster, Connection, Keypair, PublicKey } from '@solana/web3.js';
import { heliusClusterApiUrl } from 'helius-sdk';
import * as AES from 'crypto-js/aes';
import * as Utf8 from 'crypto-js/enc-utf8';
import { isSolanaAddress } from '../decorators/IsSolanaAddress';
import { Prisma } from '@prisma/client';

@Injectable()
export class WalletService {
  private readonly metaplex: Metaplex;

  constructor(
    private readonly s3: s3Service,
    private readonly prisma: PrismaService,
  ) {
    const endpoint = heliusClusterApiUrl(
      process.env.HELIUS_API_KEY,
      process.env.SOLANA_CLUSTER as Cluster,
    );
    const connection = new Connection(endpoint, 'confirmed');
    this.metaplex = new Metaplex(connection);
    const treasuryWallet = AES.decrypt(
      process.env.TREASURY_PRIVATE_KEY,
      process.env.TREASURY_SECRET,
    );
    const treasuryKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(treasuryWallet.toString(Utf8))),
    );
    this.metaplex.use(keypairIdentity(treasuryKeypair));
  }

  async syncWallet(owner: PublicKey) {
    const onChainNfts = await this.metaplex.nfts().findAllByOwner({ owner });
    const wallet = await this.prisma.wallet.findUnique({
      where: { address: owner.toString() },
      include: { nfts: true },
    });
    const candyMachines = await this.prisma.candyMachine.findMany({
      select: { address: true },
    });
    const unSyncedNfts = onChainNfts.filter(
      (nft) =>
        nft.creators.length > 1 &&
        candyMachines.find(
          (cm) => cm.address === nft.creators[1].address.toString(),
        ) &&
        !wallet.nfts.find(
          (walletNft) => walletNft.address === nft.address.toString(),
        ),
    );
    const walletSync = unSyncedNfts.map((nft) => {
      return this.prisma.nft.create({
        data: {
          address: nft.address.toString(),
          name: nft.name,
          metadata: {
            connectOrCreate: {
              where: { uri: nft.uri },
              create: { uri: nft.uri, isSigned: false, isUsed: false },
            },
          },
          owner: {
            connectOrCreate: {
              where: { address: wallet.address },
              create: {
                address: wallet.address,
                name: wallet.address,
              },
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
    try {
      const updatedWallet = await this.prisma.wallet.update({
        where: { address },
        data: updateWalletDto,
      });

      return updatedWallet;
    } catch {
      throw new NotFoundException(
        `Wallet with address ${address} does not exist`,
      );
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
