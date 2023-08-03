import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log, logErr } from './chalk';
import { PublicKey } from '@metaplex-foundation/js';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { PrismaService } from 'nestjs-prisma';

interface Options {
  candyMachineAddress: string;
}

@Command({
  name: 'thaw-collection',
  description: 'thaw whole collection after candymachine mint',
})
export class ThawCollectionCommand extends CommandRunner {
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly candyMachineService: CandyMachineService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('thaw-collection', options);
    await this.thawCollection(options);
  }

  thawCollection = async (options: Options) => {
    log('\n🏗️  thaw all nfts of collection');
    try {
      const { candyMachineAddress } = options;
      const nfts = await this.prisma.nft.findMany({
        where: { candyMachineAddress },
      });

      await Promise.all(
        nfts.map((nft) =>
          this.candyMachineService.thawFrozenNft(
            new PublicKey(candyMachineAddress),
            new PublicKey(nft.address),
            new PublicKey(nft.ownerAddress),
          ),
        ),
      );
      await this.candyMachineService.unlockFunds(
        new PublicKey(candyMachineAddress),
      );
    } catch (error) {
      logErr(`Error : ${error}`);
    }
    log('\n');
  };
}
