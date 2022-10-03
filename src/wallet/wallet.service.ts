import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import {
  deleteS3Object,
  deleteS3Objects,
  listS3FolderKeys,
  uploadFile,
} from 'src/aws/s3client';
import { isEmpty } from 'lodash';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

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
    const prefix = await this.getS3FilePrefix(address);
    const fileKey = await uploadFile(prefix, file);
    try {
      const updatedWallet = await this.prisma.wallet.update({
        where: { address },
        data: { [file.fieldname]: fileKey },
      });

      return updatedWallet;
    } catch {
      // Revert file upload
      await deleteS3Object({ Key: fileKey });
      throw new NotFoundException(
        `Wallet with address ${address} does not exist`,
      );
    }
  }

  async remove(address: string) {
    // Remove s3 assets
    const prefix = await this.getS3FilePrefix(address);
    const keys = await listS3FolderKeys({ Prefix: prefix });

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
