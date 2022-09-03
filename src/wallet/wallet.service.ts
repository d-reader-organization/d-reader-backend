import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { PublicKey } from '@solana/web3.js';
import { Role } from '@prisma/client';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async create({ address }: CreateWalletDto) {
    try {
      await PublicKey.isOnCurve(address);
    } catch (error) {
      throw new BadRequestException('Invalid ed25519 wallet address');
    }

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

  async update(address: string, { role }: UpdateWalletDto) {
    await this.breakIfSuperadmin(address);

    let updatedWallet;
    try {
      updatedWallet = await this.prisma.wallet.update({
        where: { address },
        data: { role },
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
        'Cannot mutate a wallet with Superadmin role',
      );
    }
  }
}
