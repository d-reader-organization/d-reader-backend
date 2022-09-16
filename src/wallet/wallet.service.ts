import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { Wallet, Role } from '@prisma/client';
import {
  deleteS3Object,
  deleteS3Objects,
  getS3Object,
  listS3FolderKeys,
  putS3Object,
} from 'src/aws/s3client';
import * as path from 'path';
import { isEmpty } from 'lodash';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async create(createWalletDto: CreateWalletDto) {
    const { address } = createWalletDto;

    const existingWallet = await this.prisma.wallet.findUnique({
      where: { address },
    });

    if (existingWallet) {
      throw new BadRequestException(
        `Wallet with address ${address} exists in the database`,
      );
    }

    const wallet = await this.prisma.wallet.create({
      data: { address },
    });

    return wallet;
  }

  async findAll() {
    const wallets = await this.prisma.wallet.findMany();
    return wallets;
  }

  async findOne(address: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { address },
    });

    if (!wallet) {
      throw new NotFoundException(
        `Wallet with address ${address} does not exist`,
      );
    }

    return wallet;
  }

  async update(address: string, updateWalletDto: UpdateWalletDto) {
    await this.breakIfSuperadmin(address);

    const { avatar, ...rest } = updateWalletDto;

    let avatarKey: string;
    if (avatar) {
      avatarKey = `wallets/${address}/avatar${path.extname(
        avatar.originalname,
      )}`;

      await putS3Object({
        ContentType: avatar.mimetype,
        Key: avatarKey,
        Body: avatar.buffer,
      });
    }

    let updatedWallet: Wallet;
    try {
      updatedWallet = await this.prisma.wallet.update({
        where: { address },
        data: { ...rest, avatar: avatarKey },
      });
    } catch {
      throw new NotFoundException(
        `Wallet with address ${address} does not exist`,
      );
    }

    return updatedWallet;
  }

  async remove(address: string) {
    await this.breakIfSuperadmin(address);

    // Remove s3 assets
    const keys = await listS3FolderKeys({ Prefix: `wallets/${address}` });

    if (!isEmpty(keys)) {
      await deleteS3Objects({
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      });
    }

    try {
      await this.prisma.wallet.delete({ where: { address } });
    } catch {
      throw new NotFoundException(
        `Wallet with address ${address} does not exist`,
      );
    }
    return;
  }

  async breakIfSuperadmin(address: string) {
    const wallet = await this.findOne(address);

    if (wallet.role === Role.Superadmin) {
      throw new UnauthorizedException(
        'Cannot update a wallet with Superadmin role',
      );
    }
  }
}
