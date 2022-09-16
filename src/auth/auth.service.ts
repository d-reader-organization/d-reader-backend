import {
  UnauthorizedException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'nestjs-prisma';
import { Authorization, JwtDto, TokenPayload } from './dto/authorization.dto';
import { ConfigService } from '@nestjs/config';
import { SecurityConfig } from 'src/configs/config.interface';
import { Wallet } from 'src/wallet/entities/wallet.entity';
import { PasswordService } from './password.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private jwtService: JwtService,
    private readonly prisma: PrismaService,
    private passwordService: PasswordService,
  ) {}

  // TODO v1.2: disconnect function to invalidate a token

  async connect(address: string, encoding: string): Promise<Authorization> {
    const wallet = await this.passwordService.validateWallet(address, encoding);

    return {
      accessToken: this.generateAccessToken(wallet),
      refreshToken: this.generateRefreshToken(wallet),
    };
  }

  private generateAccessToken(payload: TokenPayload): string {
    const accessToken = `Bearer ${this.jwtService.sign(payload)}`;
    return accessToken;
  }

  private generateRefreshToken(payload: TokenPayload): string {
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
      this.jwtService.verify<JwtDto>(token, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
    } catch (e) {
      throw new UnauthorizedException(
        'Refresh token invalid or expired, please reconnect',
      );
    }

    if (wallet.address !== jwtDto.address) {
      throw new UnauthorizedException(
        'Refresh and access token address mismatch',
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { iat, exp, ...tokenPayload } = jwtDto;
    return this.generateAccessToken(tokenPayload);
  }

  async validateJwt(jwtDto: JwtDto) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { address: jwtDto.address },
    });

    if (!wallet || jwtDto.nonce !== wallet.nonce) {
      throw new NotFoundException(`Invalid wallet address or nonce token`);
    }

    return wallet;
  }
}
