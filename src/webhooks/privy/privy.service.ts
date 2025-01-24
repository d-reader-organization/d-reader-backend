import { BadRequestException, Injectable } from '@nestjs/common';
import { EmailWithMetadata, PrivyClient, Wallet } from '@privy-io/server-auth';
import { PublicKey } from '@solana/web3.js';
import { PrismaService } from 'nestjs-prisma';
import { getOwnerDomain } from 'src/utils/sns';
import { WalletService } from 'src/wallet/wallet.service';

type VerifiedPayload = {
  type?: 'user.created' | 'user.authenticated' | 'user.wallet_created';
  user?: {
    linked_accounts?: (EmailWithMetadata & {
      first_verified_at: Date | null; // have to add property like this because privy prop firstVerifiedAt is always undefined
    })[];
  };
  wallet?: Wallet;
};

@Injectable()
export class PrivyService {
  private readonly privy: PrivyClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {
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
      verifiedPayload.type === 'user.authenticated' ||
      verifiedPayload.type === 'user.created'
    ) {
      await this.processUserEmailVerification(verifiedPayload);
    } else if (verifiedPayload.type === 'user.wallet_created') {
      await this.processUserWalletCreation(verifiedPayload);
    }
  }

  async processUserEmailVerification(payload: VerifiedPayload) {
    const account = payload.user?.linked_accounts?.at(0);
    const verifiedAt: Date =
      account.firstVerifiedAt ?? account.first_verified_at;
    if (!verifiedAt) {
      throw new BadRequestException('Account is not verified yet');
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
      throw new BadRequestException('Missing account or wallet');
    }
    const user = await this.prisma.user.findFirst({
      where: { email: account.address },
    });

    if (!user) {
      throw new BadRequestException('No user with given email');
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
        label: await getOwnerDomain(publicKey),
        connectedAt: new Date(),
      },
      update: { userId, connectedAt: new Date() },
      include: { user: true },
    });
  }
}
