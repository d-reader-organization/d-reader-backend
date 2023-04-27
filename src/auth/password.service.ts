import {
  UnauthorizedException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { validateEd25519Address } from '../utils/solana';
import { Transaction } from '@solana/web3.js';
import { PrismaService } from 'nestjs-prisma';
import { v4 as uuidv4 } from 'uuid';
import * as nacl from 'tweetnacl';
import * as bs58 from 'bs58';
import { RequestPasswordDto } from './dto/request-password.dto';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class PasswordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  async generateOneTimePassword(
    requestPasswordDto: RequestPasswordDto,
  ): Promise<string> {
    const nonce = uuidv4();
    const { address, name, referrer } = requestPasswordDto;

    validateEd25519Address(address);

    let createNewWallet = false;
    try {
      await this.prisma.wallet.update({
        where: { address },
        data: { nonce },
      });
    } catch (e) {
      // if wallet does not exist
      createNewWallet = true;
    }

    if (createNewWallet) {
      if (!name) {
        throw new BadRequestException('Account name is missing');
      }

      await this.prisma.wallet.create({
        data: { address, name, nonce },
      });

      if (referrer) {
        // and redeem the referral
        await this.walletService.redeemReferral(referrer, address);
      }
    }

    return `${process.env.SIGN_MESSAGE}${nonce}`;
  }

  async validateWallet(address: string, encoding: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { address } });

    if (!wallet) {
      throw new NotFoundException(`No wallet found with address ${address}`);
    }

    const match = this.matchPassword(wallet.nonce, address, encoding);

    if (match) return wallet;
  }

  private matchPassword(nonce: string, address: string, encoding: string) {
    const oneTimePassword = `${process.env.SIGN_MESSAGE}${nonce}`;
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
      console.log(e);
      // Failed to construct a Transaction object
    }

    throw new UnauthorizedException('Failed to connect the wallet!');
  }
}
