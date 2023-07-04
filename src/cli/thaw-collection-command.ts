import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log, logErr } from './chalk';
import { Metaplex, PublicKey } from '@metaplex-foundation/js';
import { initMetaplex } from '../utils/metaplex';
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
  private readonly metaplex: Metaplex;

  constructor(
    private readonly inquirerService: InquirerService,
    private readonly candyMachineService: CandyMachineService,
    private readonly prisma: PrismaService,
  ) {
    super();
    this.metaplex = initMetaplex();
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('thaw-collection', options);
    await this.thawCollection(options);
  }

  thawCollection = async (options: Options) => {
    log('\n🏗️  thaw all nfts of collection');
    try {
      const { candyMachineAddress } = options;
      const candyMachinePublicKey = new PublicKey(candyMachineAddress);
      const candyMachine = await this.metaplex
        .candyMachines()
        .findByAddress({ address: candyMachinePublicKey });

      const nfts = await this.prisma.nft.findMany({
        where: { candyMachineAddress },
      });
      await Promise.all(
        nfts.map((nft) =>
          this.candyMachineService.thawFrozenNft(
            candyMachine,
            new PublicKey(nft.address),
            new PublicKey(nft.ownerAddress),
          ),
        ),
      );
      await this.candyMachineService.unlockFunds(candyMachine);
    } catch (error) {
      logErr(`Error : ${error}`);
    }
    log('\n');
  };
}
