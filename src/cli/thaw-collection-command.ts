import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log, logErr } from './chalk';
import { PublicKey } from '@metaplex-foundation/js';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { PrismaService } from 'nestjs-prisma';
import { ComicIssueService } from '../comic-issue/comic-issue.service';

interface Options {
  candyMachineAddress: string;
  comicIssueId: number;
}

@Command({
  name: 'thaw-collection',
  description: 'thaw whole collection after candymachine mint',
})
export class ThawCollectionCommand extends CommandRunner {
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly candyMachineService: CandyMachineService,
    private readonly comicIssueService: ComicIssueService,
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
      const { candyMachineAddress, comicIssueId } = options;
      const nfts = await this.prisma.nft.findMany({
        where: { candyMachineAddress },
      });

      // TODO: should we do this in a batch ?
      // TODO: should this be run as another script and not on backend?
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
      const activeCandyMachine =
        await this.comicIssueService.findActiveCandyMachine(comicIssueId);
      if (!activeCandyMachine) {
        await this.prisma.comicIssue.update({
          where: { id: comicIssueId },
          data: {
            isSecondarySaleActive: true,
          },
        });
      }
    } catch (error) {
      logErr(`Error : ${error}`);
    }
    log('\n');
  };
}
