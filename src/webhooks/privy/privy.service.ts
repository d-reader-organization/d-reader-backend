import { BadRequestException, Injectable } from '@nestjs/common';
import { PrivyClient } from '@privy-io/server-auth';
import { PublicKey } from '@solana/web3.js';
import { PrismaService } from 'nestjs-prisma';
import { ERROR_MESSAGES } from 'src/utils/errors';
import { getOwnerDomain } from 'src/utils/sns';
import { WalletService } from 'src/wallet/wallet.service';
import { EventType, VerifiedPayload } from './types';
import { WalletProvider } from '@prisma/client';

@Injectable()
export class PrivyService {
  private readonly privy: PrivyClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {
    if (!process.env.PRIVY_APP_ID || !process.env.PRIVY_APP_SECRET) {
      console.log(`missing privy app id and/or secret`);
      return;
    }
    this.privy = new PrivyClient(
      process.env.PRIVY_APP_ID as string,
      process.env.PRIVY_APP_SECRET as string,
    );
  }

  async processWebhookEvent(req: Request) {
    const id = req.headers['svix-id'] ?? '';
    const timestamp = req.headers['svix-timestamp'] ?? '';
    const signature = req.headers['svix-signature'] ?? '';

    // If the webhook payload is invalid, the method will throw an error
    const verifiedPayload: VerifiedPayload = await this.privy.verifyWebhook(
      req.body,
      { id, timestamp, signature },
      process.env.PRIVY_WEBHOOK_SIGNING_KEY,
    );

    if (
      verifiedPayload.type === EventType.userAuthenticated ||
      verifiedPayload.type === EventType.userCreated
    ) {
      await this.processUserEmailVerification(verifiedPayload);
    } else if (verifiedPayload.type === EventType.userWalletCreated) {
      await this.processUserWalletCreation(verifiedPayload);
    }
  }

  async processUserEmailVerification(payload: VerifiedPayload) {
    const account = payload.user?.linked_accounts?.at(0);
    const verifiedAt: Date =
      account.firstVerifiedAt ?? account.first_verified_at;
    if (!verifiedAt) {
      throw new BadRequestException(ERROR_MESSAGES.EMAIL_NOT_VERIFIED);
    }
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: account.address,
      },
    });
    if (existingUser.emailVerifiedAt) {
      throw new BadRequestException(ERROR_MESSAGES.EMAIL_ALREADY_VERIFIED);
    }
    const updatedUser = await this.prisma.user.update({
      where: {
        email: account.address,
      },
      data: { emailVerifiedAt: new Date() },
    });
    await this.walletService.makeEligibleForReferralBonus(updatedUser.id);
    await this.walletService.makeEligibleForReferralBonus(
      updatedUser.referrerId,
    );
  }

  async processUserWalletCreation(payload: VerifiedPayload) {
    const account = payload.user?.linked_accounts?.at(0);

    const privyWallet = payload.wallet;
    if (!account || !privyWallet) {
      throw new BadRequestException(ERROR_MESSAGES.PRIVY_NO_ACCOUNT_OR_WALLET);
    }
    const user = await this.prisma.user.findFirst({
      where: { email: account.address },
    });

    if (!user) {
      throw new BadRequestException(
        ERROR_MESSAGES.USER_NOT_FOUND({ key: 'email', value: account.address }),
      );
    }
    const userId = user.id;
    const address = privyWallet.address;
    const publicKey = new PublicKey(address);

    await this.prisma.wallet.upsert({
      where: {
        address,
      },
      create: {
        address,
        userId,
        provider: WalletProvider.Embedded,
        label: await getOwnerDomain(publicKey),
        connectedAt: new Date(),
      },
      update: { userId },
      include: { user: true },
    });
  }
}
