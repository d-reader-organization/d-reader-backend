import {
  UnauthorizedException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'nestjs-prisma';
import { v4 as uuidv4 } from 'uuid';
import * as bs58 from 'bs58';
import * as nacl from 'tweetnacl';
import { Message, Transaction } from '@solana/web3.js';
import { Authorization, JwtDto, TokenPayload } from './dto/authorization.dto';
import { ConfigService } from '@nestjs/config';
import { SecurityConfig } from 'src/configs/config.interface';
import { Wallet } from 'src/wallet/entities/wallet.entity';
import { validateEd25519Address } from 'src/utils/solana';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private jwtService: JwtService,
    private readonly prisma: PrismaService, // TODO move some stuff to walletService
  ) {}

  // TODO: move this to password.service.ts
  async generateOneTimePassword(address: string): Promise<string> {
    const nonce = uuidv4();

    validateEd25519Address(address);

    await this.prisma.wallet.upsert({
      where: { address },
      update: { nonce },
      create: { address, nonce },
    });

    // TODO: bcrypt.hash ?
    return `${process.env.SIGN_MESSAGE}${nonce}`;
  }

  // TODO: move this to password.service.ts
  async validateWallet(address: string, encoding: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { address } });

    if (!wallet) {
      throw new NotFoundException(`No wallet found with address ${address}`);
    }

    const match = this.matchPassword(wallet.nonce, address, encoding);

    if (match) return wallet;
  }

  // TODO: move this to password.service.ts
  private matchPassword(nonce: string, address: string, encoding: string) {
    const oneTimePassword = `${process.env.SIGN_MESSAGE}${nonce}`;
    const oneTimePasswordBytes = new TextEncoder().encode(oneTimePassword);

    const publicKeyBytes = bs58.decode(address);
    const signatureBytes = bs58.decode(encoding);

    // Try to construct a Message and match message bytes with OTP bytes
    try {
      // TODO: review this part
      // const message = Message.from(signatureBytes);
      const isVerified = nacl.sign.detached.verify(
        oneTimePasswordBytes,
        signatureBytes,
        publicKeyBytes,
      );

      if (!isVerified) {
        throw new UnauthorizedException('Malformed message!');
      } else return true;
    } catch (e) {
      console.log(e);
      // Failed to construct a Message object
    }

    // Try to construct a Transaction and match its instruction data against OTP bytes
    try {
      const transaction = Transaction.from(signatureBytes);

      const txHasOnlyOneSigner = transaction.signatures.length === 1;
      const txHasOnlyOneInstruction = transaction.instructions.length === 1;
      const txSignerMatchesPublicKey = transaction.signatures[0].publicKey
        .toBuffer()
        .equals(publicKeyBytes);
      const txInstructionMatchesOTP =
        transaction.instructions[0].data.equals(oneTimePasswordBytes);

      if (
        txHasOnlyOneSigner &&
        txSignerMatchesPublicKey &&
        txHasOnlyOneInstruction &&
        txInstructionMatchesOTP
      ) {
        const isVerified = transaction.verifySignatures();

        if (!isVerified) {
          throw new UnauthorizedException('Malformed transaction!');
        } else return true;
      }
    } catch (e) {
      // Failed to construct a Message object
    }

    throw new UnauthorizedException('Failed to connect the wallet!');
  }

  // TODO: disconnect function to invalidate a token

  async connect(address: string, encoding: string): Promise<Authorization> {
    const wallet = await this.validateWallet(address, encoding);

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

    // TODO: return walletDto instead, without the nonce token
    return wallet;
  }
}
