import {
  UnauthorizedException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'nestjs-prisma';
import {
  EmailJwtDto,
  JwtDto,
  JwtPayload,
  EmailPayload,
} from './dto/authorization.dto';
import { ConfigService } from '@nestjs/config';
import { SecurityConfig } from '../configs/config.interface';
import { PasswordService } from './password.service';
import { Creator, User } from '@prisma/client';
import { pick } from 'lodash';
import { getOwnerDomain } from '../utils/sns';
import { PublicKey } from '@solana/web3.js';
import { WalletService } from '../wallet/wallet.service';

const sanitizePayload = (payload: JwtPayload) => {
  return pick(payload, 'type', 'id', 'email', 'name', 'role');
};

// One day  we can consider splitting this into two passport strategies
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
    private readonly walletService: WalletService,
  ) {}

  async connectWallet(userId: number, address: string, encoding: string) {
    await this.passwordService.validateWallet(userId, address, encoding);
    const publicKey = new PublicKey(address);
    const wallet = await this.prisma.wallet.upsert({
      where: { address },
      create: {
        address,
        userId,
        label: await getOwnerDomain(publicKey),
        connectedAt: new Date(),
      },
      update: { userId: userId, connectedAt: new Date() },
      include: { user: true },
    });

    await this.walletService.makeEligibleForReferralBonus(userId);
    await this.walletService.makeEligibleForReferralBonus(
      wallet.user.referrerId,
    );
  }

  async disconnectWallet(address: string) {
    return await this.prisma.wallet.update({
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

  /** @deprecated */
  signEmail(email: string, expiresIn = '7d'): string {
    const signedEmail = this.jwtService.sign(
      { email },
      { secret: this.configService.get('JWT_ACCESS_SECRET'), expiresIn },
    );
    return signedEmail;
  }

  /** @deprecated */
  decodeEmail(emailToken: string) {
    const emailJwtDto = this.jwtService.decode(emailToken);

    if (
      typeof emailJwtDto === 'object' &&
      'email' in emailJwtDto &&
      typeof emailJwtDto.email === 'string'
    ) {
      return emailJwtDto.email;
    } else throw new BadRequestException('Malformed email token');
  }

  private generateAccessToken(payload: JwtPayload): string {
    const sanitizedPayload = sanitizePayload(payload);
    const accessToken = `Bearer ${this.jwtService.sign(sanitizedPayload)}`;
    return accessToken;
  }

  private generateRefreshToken(payload: JwtPayload): string {
    const sanitizedPayload = sanitizePayload(payload);
    const securityConfig = this.configService.get<SecurityConfig>('security');

    const refreshToken = this.jwtService.sign(sanitizedPayload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: securityConfig.refreshIn,
    });

    return refreshToken;
  }

  generateEmailToken(id: number, email: string, expiresIn = '7d') {
    return this.jwtService.sign(
      { email, id },
      {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
        expiresIn,
      },
    );
  }

  verifyEmailToken(token: string): EmailPayload {
    let emailJwtDto: EmailJwtDto;
    try {
      emailJwtDto = this.jwtService.verify<EmailJwtDto>(token, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException(
        'Session token expired, submit new reset password request',
      );
    }

    if (
      typeof emailJwtDto === 'object' &&
      'email' in emailJwtDto &&
      'id' in emailJwtDto
    ) {
      return {
        email: emailJwtDto.email,
        id: emailJwtDto.id,
      };
    } else throw new BadRequestException('Malformed email token');
  }

  async refreshAccessToken(token: string) {
    let jwtDto: JwtDto;
    try {
      jwtDto = this.jwtService.verify<JwtDto>(token, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Authorization expired');
    }

    // if (jwtPayload.id !== jwtDto.id) {
    //   throw new UnauthorizedException('Refresh and access token id mismatch');
    // }

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
