import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log, logErr } from './chalk';
import { PublicKey, WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { PrismaService } from 'nestjs-prisma';
import { ComicIssueService } from '../comic-issue/comic-issue.service';
import { pRateLimit } from 'p-ratelimit';
import { rateLimitQuota } from '../constants';

interface Options {
  candyMachineAddress: string;
  comicIssueId: number;
}

const rateLimit = pRateLimit(rateLimitQuota);
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
      const nfts = await this.prisma.digitalAsset.findMany({
        where: {
          candyMachineAddress,
        },
        include: {
          receipt: {
            select: {
              label: true,
              splTokenAddress: true,
            },
          },
        },
      });

      try {
        for (const nft of nfts) {
          await rateLimit(() => {
            return this.candyMachineService.thawFrozenNft(
              new PublicKey(candyMachineAddress),
              new PublicKey(nft.address),
              new PublicKey(nft.ownerAddress),
              nft.receipt.splTokenAddress === WRAPPED_SOL_MINT.toBase58()
                ? 'freezeSolPayment'
                : 'freezeTokenPayment',
              nft.receipt.label,
            );
          });
        }

        const candyMachineGroups = await this.prisma.candyMachineGroup.findMany(
          {
            where: { candyMachineAddress },
          },
        );
        for (const group of candyMachineGroups) {
          await rateLimit(() => {
            return this.candyMachineService.unlockFunds(
              new PublicKey(candyMachineAddress),
              group.splTokenAddress === WRAPPED_SOL_MINT.toBase58()
                ? 'freezeSolPayment'
                : 'freezeTokenPayment',
              group.label,
            );
          });
        }
      } catch (e) {
        console.error(e);
      }

      const activeCandyMachine =
        await this.comicIssueService.findActiveCandyMachine(comicIssueId);
      if (!activeCandyMachine) {
        await this.prisma.comicIssue.update({
          where: { id: comicIssueId },
          data: { isSecondarySaleActive: true },
        });
      }
    } catch (error) {
      logErr(`Error : ${error}`);
    }
    log('\n');
  };
}
