import {
  UnauthorizedException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import config from '../configs/config';
import { v4 as uuidv4 } from 'uuid';
import * as bs58 from 'bs58';
import * as bcrypt from 'bcrypt';
import { verifySignature } from '../utils/transactions';
import { VersionedTransaction } from '@solana/web3.js';
import { SignedDataType } from './dto/connect-wallet.dto';

@Injectable()
export class PasswordService {
  constructor(private readonly prisma: PrismaService) {}

  async generateOneTimePassword(userId: number): Promise<string> {
    const nonce = uuidv4();

    await this.prisma.user.update({
      where: { id: userId },
      data: { nonce },
    });

    return `${process.env.SIGN_MESSAGE}${nonce}`;
  }

  async hash(password: string) {
    const saltOrRound = config().security.bcryptSaltOrRound;
    return await bcrypt.hash(password, saltOrRound);
  }

  async validate(password: string, hashedPassword: string) {
    const isPasswordValid = await bcrypt.compare(password, hashedPassword);
    if (!isPasswordValid) {
      throw new BadRequestException('Incorrect password!');
    }
  }

  async validateWallet(
    userId: number,
    address: string,
    encoding: string,
    type: SignedDataType,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`No user found with id ${address}`);
    }

    const oneTimePassword = `${process.env.SIGN_MESSAGE}${user.nonce}`;
    const oneTimePasswordBytes = new TextEncoder().encode(oneTimePassword);
    let signatures: Uint8Array[];

    try {
      if (type == SignedDataType.Message) {
        signatures = [bs58.decode(encoding)];
      } else {
        const transaction = VersionedTransaction.deserialize(
          Buffer.from(encoding, 'base64'),
        );
        signatures = transaction.signatures;
      }
    } catch (e) {
      throw new BadRequestException(
        "There's a problem with the signed message. try again",
      );
    }

    const publicKeyBytes = bs58.decode(address);
    if (!verifySignature(oneTimePasswordBytes, signatures, publicKeyBytes)) {
      throw new UnauthorizedException('Unverified Transaction');
    }
  }
}
