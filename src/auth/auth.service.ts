import {
  UnauthorizedException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'nestjs-prisma';
import { JwtDto, JwtPayload } from './dto/authorization.dto';
import { ConfigService } from '@nestjs/config';
import { SecurityConfig } from '../configs/config.interface';
import { PasswordService } from './password.service';
import { Creator, User } from '@prisma/client';

// One day  we can consider splitting this into two passport strategies
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
      accessToken: this.generateAccessToken({ ...user, type: 'user' }),
      refreshToken: this.generateRefreshToken({ ...user, type: 'user' }),
    };
  }

  authorizeCreator(creator: Creator) {
    return {
      accessToken: this.generateAccessToken({ ...creator, type: 'creator' }),
      refreshToken: this.generateRefreshToken({ ...creator, type: 'creator' }),
    };
  }

  private generateAccessToken(payload: JwtPayload): string {
    const accessToken = `Bearer ${this.jwtService.sign(payload)}`;
    return accessToken;
  }

  private generateRefreshToken(payload: JwtPayload): string {
    const securityConfig = this.configService.get<SecurityConfig>('security');

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: securityConfig.refreshIn,
    });

    return refreshToken;
  }

  async refreshAccessToken(jwtPayload: JwtPayload, token: string) {
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

    if (jwtPayload.id !== jwtDto.id) {
      throw new UnauthorizedException('Refresh and access token id mismatch');
    }

    if (jwtDto.type === 'user') {
      const user = await this.prisma.user.update({
        where: { id: jwtDto.id },
        data: { lastLogin: new Date() },
      });

      return this.generateAccessToken({ ...user, type: 'user' });
    } else if (jwtDto.type === 'creator') {
      const creator = await this.prisma.creator.update({
        where: { id: jwtDto.id },
        data: { lastLogin: new Date() },
      });

      return this.generateAccessToken({ ...creator, type: 'creator' });
    }
  }

  async validateJwt(jwtDto: JwtDto): Promise<JwtPayload> {
    if (jwtDto.type === 'user') {
      const user = await this.prisma.user.findUnique({
        where: { id: jwtDto.id },
      });

      if (!user) throw new NotFoundException('User not found');
      return { ...user, type: 'user' };
    } else if (jwtDto.type === 'creator') {
      const creator = await this.prisma.creator.findUnique({
        where: { id: jwtDto.id },
      });

      if (!creator) throw new NotFoundException('Creator not found');
      return { ...creator, type: 'creator' };
    } else {
      throw new ForbiddenException('Authorization type unknown: ', jwtDto);
    }
  }
}
