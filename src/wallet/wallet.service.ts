import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { Role } from '@prisma/client';
import {
  deleteS3Object,
  deleteS3Objects,
  listS3FolderKeys,
  putS3Object,
} from 'src/aws/s3client';
import { isEmpty } from 'lodash';
import * as path from 'path';

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
    const fileKey = await this.uploadFile(address, file);
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

  async uploadFile(address: string, file: Express.Multer.File) {
    if (file) {
      const fileKey = `wallets/${address}/${file.fieldname}${path.extname(
        file.originalname,
      )}`;

      await putS3Object({
        ContentType: file.mimetype,
        Key: fileKey,
        Body: file.buffer,
      });

      return fileKey;
    } else {
      throw new BadRequestException(`No valid ${file.fieldname} file provided`);
    }
  }
}
