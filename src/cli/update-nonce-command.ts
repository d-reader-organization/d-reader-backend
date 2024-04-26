import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log, logErr } from './chalk';
import { PublicKey } from '@metaplex-foundation/js';
import { PrismaService } from 'nestjs-prisma';
import { NonceService } from '../nonce/nonce.service';
import { DurableNonceStatus } from '@prisma/client';

interface Options {
  status: DurableNonceStatus;
}

@Command({
  name: 'update-nonce',
  description: 'update nonce with current onchain values',
})
export class UpdateNonceCommand extends CommandRunner {
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly nonceService: NonceService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('update-nonce', options);
    await this.updateNonce(options);
  }

  updateNonce = async (options: Options) => {
    log('\n🏗️  updating nonces...!');
    try {
      const { status } = options;
      const tenMinutesAgo = new Date(Date.now() - 1000 * 60 * 10); // Update all nonce that hasn't been updated in last 10 minutes

      const nonces = await this.prisma.durableNonce.findMany({
        where: { status, lastUpdatedAt: { lt: tenMinutesAgo } },
      });

      console.log(`Found ${nonces.length} nonces to update`);
      const updateNoncePromises = nonces.map((nonce) =>
        this.nonceService.updateNonce(new PublicKey(nonce.address)),
      );
      await Promise.all(updateNoncePromises);
      console.log(`Update Compelete !`);
    } catch (error) {
      logErr(`Error : ${error}`);
    }
  };
}
