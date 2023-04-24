import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import * as jdenticon from 'jdenticon';
import { s3Service } from '../aws/s3.service';

@Injectable()
export class WalletService {
  constructor(
    private readonly s3: s3Service,
    private readonly prisma: PrismaService,
  ) {}

  async create(createWalletDto: CreateWalletDto) {
    try {
      const wallet = await this.prisma.wallet.create({
        data: createWalletDto,
      });

      return wallet;
    } catch {
      throw new BadRequestException('Bad wallet data');
    }
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

  async redeemReferral(referrer: string, address: string) {
    const referrerWallet = await this.prisma.wallet.findUnique({
      where: { name: referrer },
    });
    if (!referrerWallet) {
      throw new BadRequestException(`user ${referrer} doesn't exist`);
    }
    if (referrerWallet.referralsRemaining == 0) {
      throw new BadRequestException(
        `user ${referrerWallet.name} doesn't have referrals left`,
      );
    }
    const wallet = await this.prisma.wallet.findUnique({ where: { address } });
    if (!!wallet.referredAt) {
      throw new BadRequestException(`user ${wallet.name} is already referred`);
    }

    await this.prisma.wallet.update({
      where: { address },
      data: {
        referredAt: new Date(),
        referrer: {
          connect: { address: referrerWallet.address },
          update: { referralsRemaining: referrerWallet.referralsRemaining - 1 },
        },
      },
    });

    return;
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
