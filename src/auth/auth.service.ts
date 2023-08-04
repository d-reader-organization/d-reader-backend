import {
  UnauthorizedException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'nestjs-prisma';
import { EntityType, JwtDto, JwtPayload } from './dto/authorization.dto';
import { ConfigService } from '@nestjs/config';
import { SecurityConfig } from '../configs/config.interface';
import { PasswordService } from './password.service';
import { Creator, User } from '@prisma/client';

function sanitizePayload(
  payload: User | Creator,
  type: EntityType,
): JwtPayload {
  return {
    id: payload.id,
    name: payload.name,
    email: payload.email,
    type: type,
  };
}

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
      accessToken: this.generateAccessToken(user, 'user'),
      refreshToken: this.generateRefreshToken(user, 'user'),
    };
  }

  authorizeCreator(creator: Creator) {
    return {
      accessToken: this.generateAccessToken(creator, 'creator'),
      refreshToken: this.generateRefreshToken(creator, 'creator'),
    };
  }

  private generateAccessToken(
    payload: User | Creator,
    type: EntityType,
  ): string {
    const sanitizedPayload = sanitizePayload(payload, type);
    const accessToken = `Bearer ${this.jwtService.sign(sanitizedPayload)}`;
    return accessToken;
  }

  private generateRefreshToken(
    payload: User | Creator,
    type: EntityType,
  ): string {
    const securityConfig = this.configService.get<SecurityConfig>('security');
    const sanitizedPayload = sanitizePayload(payload, type);

    const refreshToken = this.jwtService.sign(sanitizedPayload, {
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

    let userOrCreator: User | Creator;
    if (jwtDto.type === 'user') {
      userOrCreator = await this.prisma.user.update({
        where: { id: jwtDto.id },
        data: { lastLogin: new Date() },
      });
    } else if (jwtDto.type === 'creator') {
      userOrCreator = await this.prisma.creator.update({
        where: { id: jwtDto.id },
        data: { lastLogin: new Date() },
      });
    }

    return this.generateAccessToken(userOrCreator, jwtDto.type);
  }

  async validateJwt(jwtDto: JwtDto) {
    if (jwtDto.type === 'user') {
      const user = await this.prisma.user.findUnique({
        where: { id: jwtDto.id },
      });

      if (!user) throw new NotFoundException('User not found');
    } else if (jwtDto.type === 'creator') {
      const creator = await this.prisma.creator.findUnique({
        where: { id: jwtDto.id },
      });

      if (!creator) throw new NotFoundException('Creator not found');
    } else {
      throw new ForbiddenException('Authorization type unknown: ', jwtDto.type);
    }
  }
}
