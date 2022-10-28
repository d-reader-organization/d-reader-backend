import {
  UnauthorizedException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'nestjs-prisma';
import { Authorization, JwtDto } from './dto/authorization.dto';
import { ConfigService } from '@nestjs/config';
import { SecurityConfig } from 'src/configs/config.interface';
import { PasswordService } from './password.service';
import { Wallet, Creator } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
  ) {}

  async connect(address: string, encoding: string): Promise<Authorization> {
    const wallet = await this.passwordService.validateWallet(address, encoding);
    await this.prisma.wallet.update({
      where: { address: wallet.address },
      data: { lastLogin: new Date() },
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
    else if (jwtDto.nonce !== wallet.nonce) {
      throw new NotFoundException(`Expired nonce token`);
    } else return wallet;
  }
}
