import {
  UnauthorizedException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Transaction } from '@solana/web3.js';
import { PrismaService } from 'nestjs-prisma';
import config from '../configs/config';
import { v4 as uuidv4 } from 'uuid';
import * as nacl from 'tweetnacl';
import * as bs58 from 'bs58';
import * as bcrypt from 'bcrypt';

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

  async validateWallet(userId: number, address: string, encoding: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`No user found with id ${address}`);
    }

    const oneTimePassword = `${process.env.SIGN_MESSAGE}${user.nonce}`;
    const oneTimePasswordBytes = new TextEncoder().encode(oneTimePassword);

    const publicKeyBytes = bs58.decode(address);
    const signatureBytes = bs58.decode(encoding);

    // Try to construct a Message and match message bytes with OTP bytes
    try {
      // @deprecated: const message = Message.from(signatureBytes);
      const isVerified = nacl.sign.detached.verify(
        oneTimePasswordBytes,
        signatureBytes,
        publicKeyBytes,
      );

      if (!isVerified) {
        throw new UnauthorizedException('Malformed message!');
      } else return true;
    } catch (e) {
      console.error('Failed to construct a Message object: ', e);
    }

    // Try to construct a Transaction and match its instruction data against OTP bytes
    try {
      console.log('Trying fallback for the ledger');
      const transaction = Transaction.from(signatureBytes);

      const txHasOnlyOneSigner = transaction.signatures.length === 1;
      const txSignerMatchesPublicKey = transaction.signatures[0].publicKey
        .toBuffer()
        .equals(publicKeyBytes);
      const txInstructionMatchesOTP = transaction.instructions
        .at(-1)
        .data.equals(oneTimePasswordBytes);

      console.log('before if condition');
      if (
        txHasOnlyOneSigner &&
        txSignerMatchesPublicKey &&
        txInstructionMatchesOTP
      ) {
        console.log('before isVerified');
        const isVerified = transaction.verifySignatures();
        console.log('after isVerified: ', isVerified);

        if (!isVerified) {
          throw new UnauthorizedException('Malformed transaction!');
        } else return true;
      }
    } catch (e) {
      // Failed to construct a Transaction object
      throw new UnauthorizedException('Failed to connect the wallet!', e);
    }
  }
}
