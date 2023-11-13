import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log, logErr } from './chalk';
import { PrismaService } from 'nestjs-prisma';
import { DarkblockService } from '../candy-machine/darkblock.service';

interface Options {
  comicIssueId: number;
}

@Command({
  name: 'add-collection-darkblock',
  description: 'add darkblock for used nfts in the collection',
})
export class AddCollectionDarkblockCommand extends CommandRunner {
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly prisma: PrismaService,
    private readonly darkblockService: DarkblockService,
  ) {
    super();
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask(
      'add-collection-darkblock',
      options,
    );
    await this.addCollectionDarkblock(options);
  }

  addCollectionDarkblock = async (options: Options) => {
    log('\n🏗️  add darkblock for used nfts in the collection');
    try {
      const { comicIssueId } = options;
      const issue = await this.prisma.comicIssue.findUnique({
        where: { id: comicIssueId },
        include: { collectionNft: true },
      });
      if (!issue.collectionNft) {
        throw new Error(
          `Comic Issue ${comicIssueId} doesn't have a collection!`,
        );
      }
      const response = await this.darkblockService.addCollectionDarkblock(
        issue.pdf,
        issue.description,
        issue.collectionNft.name,
        [{ name: 'used', value: 'true' }],
      );
      console.log(`Darkblock added succesfully ${response}`);
    } catch (error) {
      logErr(`Error : ${error}`);
    }
    log('\n');
  };
}
