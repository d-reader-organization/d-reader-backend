import {
  UnauthorizedException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'nestjs-prisma';
import { JwtDto } from './dto/authorization.dto';
import { ConfigService } from '@nestjs/config';
import { SecurityConfig } from '../configs/config.interface';
import { PasswordService } from './password.service';
import { Creator, User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
  ) {}

  async connectWallet(userId: number, address: string, encoding: string) {
    this.passwordService.validateWallet(userId, address, encoding);

    await this.prisma.wallet.upsert({
      where: { address },
      create: { address, userId: userId },
      update: { userId: userId },
    });
  }

  async disconnectWallet(address: string) {
    await this.prisma.wallet.update({
      where: { address },
      data: { userId: null },
    });
  }

  authorizeUser(user: User) {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }

  private generateAccessToken(payload: User): string {
    const accessToken = `Bearer ${this.jwtService.sign(payload)}`;
    return accessToken;
  }

  private generateRefreshToken(payload: User): string {
    const securityConfig = this.configService.get<SecurityConfig>('security');

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: securityConfig.refreshIn,
    });

    return refreshToken;
  }

  async refreshAccessToken(user: User, token: string) {
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

    if (user.id !== jwtDto.id) {
      throw new UnauthorizedException(
        'Refresh and access token address mismatch',
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return this.generateAccessToken(user);
  }

  async validateJwt(jwtDto: JwtDto): Promise<User & { creator?: Creator }> {
    const user = await this.prisma.user.findUnique({
      where: { id: jwtDto.id },
      include: { creator: true },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
