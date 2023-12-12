import {
  UnauthorizedException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'nestjs-prisma';
import { EmailJwtDto, JwtDto, JwtPayload } from './dto/authorization.dto';
import { ConfigService } from '@nestjs/config';
import { SecurityConfig } from '../configs/config.interface';
import { PasswordService } from './password.service';
import { Creator, User } from '@prisma/client';
import { pick } from 'lodash';
import { getOwnerDomain } from '../utils/sns';
import { PublicKey } from '@solana/web3.js';
import {
  FREE_MINT_GROUP_LABEL,
  REFERRAL_REWARD_GROUP_LABEL,
} from '../constants';
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
    const { user, ...wallet } = await this.prisma.wallet.upsert({
      where: { address },
      create: {
        address,
        userId: userId,
        label: await getOwnerDomain(publicKey),
        connectedAt: new Date(),
      },
      update: { userId: userId, connectedAt: new Date() },
      include: {
        user: {
          include: {
            referrals: { include: { wallets: true } },
            referrer: {
              include: { referrals: { include: { wallets: true } } },
            },
          },
        },
      },
    });
    let rewardedAt: Date = undefined,
      referCompeletedAt = undefined;

    // Check the refer reward for current user
    if (
      user.emailVerifiedAt &&
      this.walletService.checkIfUserIsEligibleForReferrerReward(user)
    ) {
      await this.walletService.rewardUserWallet(
        [wallet],
        REFERRAL_REWARD_GROUP_LABEL,
      );
      referCompeletedAt = new Date();
    }

    // Check the refer reward for referrer
    if (
      user.referrer &&
      user.referrer.emailVerifiedAt &&
      this.walletService.checkIfUserIsEligibleForReferrerReward(user.referrer)
    ) {
      await this.walletService.rewardUserWallet(
        [wallet],
        REFERRAL_REWARD_GROUP_LABEL,
      );
      await this.prisma.user.update({
        where: { id: user.referrerId },
        data: { referCompeletedAt: new Date() },
      });
    }

    if (
      !user.rewardedAt &&
      user.emailVerifiedAt &&
      this.walletService.checkIfRewardClaimed(user.id)
    ) {
      await this.walletService.rewardUserWallet(
        [wallet],
        FREE_MINT_GROUP_LABEL,
      );
      rewardedAt = new Date();
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { rewardedAt, referCompeletedAt },
    });

    return wallet;
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

  signEmail(email: string): string {
    const signedEmail = this.jwtService.sign(
      { email },
      {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
        expiresIn: '1d',
      },
    );
    return signedEmail;
  }

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

  verifyEmail(emailToken: string) {
    let emailJwtDto: EmailJwtDto;
    try {
      emailJwtDto = this.jwtService.verify<EmailJwtDto>(emailToken, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException(
        'Token expired, new verification link is sent to your inbox',
      );
    }

    if (typeof emailJwtDto === 'object' && 'email' in emailJwtDto) {
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
