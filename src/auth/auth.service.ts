import {
  UnauthorizedException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'nestjs-prisma';
import { Authorization, JwtDto } from './dto/authorization.dto';
import { ConfigService } from '@nestjs/config';
import { SecurityConfig } from '../configs/config.interface';
import { PasswordService } from './password.service';
import { Wallet, Creator } from '@prisma/client';
import { Cluster } from '../types/cluster';
import { WalletService } from '../wallet/wallet.service';
import { WALLET_NAME_SIZE } from '../constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
    private readonly walletService: WalletService,
  ) {}

  async connect(address: string, encoding: string): Promise<Authorization> {
    const wallet = await this.passwordService.validateWallet(address, encoding);

    let avatar = wallet.avatar || '';
    // If wallet has no avatar, generate a random one
    if (!avatar) {
      avatar = await this.walletService.generateAvatar(address);
    }

    await this.prisma.wallet.update({
      where: { address: wallet.address },
      data: { lastLogin: new Date(), avatar },
    });

    return {
      accessToken: this.generateAccessToken(wallet),
      refreshToken: this.generateRefreshToken(wallet),
    };
  }

  private generateAccessToken(payload: Wallet): string {
    const accessToken = `Bearer ${this.jwtService.sign(payload)}`;
    return accessToken;
  }

  private generateRefreshToken(payload: Wallet): string {
    const securityConfig = this.configService.get<SecurityConfig>('security');

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: securityConfig.refreshIn,
    });

    return refreshToken;
  }

  async refreshAccessToken(wallet: Wallet, token: string) {
    let jwtDto: JwtDto;
    try {
      jwtDto = this.jwtService.verify<JwtDto>(token, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException(
        'Refresh token invalid or expired, please reconnect',
      );
    }

    if (wallet.address !== jwtDto.address) {
      throw new UnauthorizedException(
        'Refresh and access token address mismatch',
      );
    }

    await this.prisma.wallet.update({
      where: { address: wallet.address },
      data: { lastLogin: new Date() },
    });

    return this.generateAccessToken(wallet);
  }

  async validateJwt(jwtDto: JwtDto): Promise<Wallet & { creator?: Creator }> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { address: jwtDto.address },
      include: { creator: true },
    });

    if (!wallet) throw new NotFoundException(`Invalid wallet address`);
    else if (
      // Check nonce token expiry only on the 'mainnet-beta' environment
      process.env.SOLANA_CLUSTER === Cluster.MainnetBeta &&
      jwtDto.nonce !== wallet.nonce
    ) {
      throw new NotFoundException(`Expired nonce token`);
    } else return wallet;
  }

  async validateName(name: string) {
    const usernameRegex = RegExp(/^[a-zA-Z0-9]/g);
    if (!name || name.length > WALLET_NAME_SIZE) {
      throw new BadRequestException(
        `Account name can have maximum of ${WALLET_NAME_SIZE} characters`,
      );
    } else if (!usernameRegex.test(name)) {
      throw new BadRequestException(`Account name should be alpha numeric.`);
    }
    const wallet = await this.prisma.wallet.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

    if (wallet) {
      throw new BadRequestException('Account name already taken');
    }

    return true;
  }
}
