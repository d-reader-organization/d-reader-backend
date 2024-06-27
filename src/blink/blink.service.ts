import { PrismaService } from 'nestjs-prisma';
import { Injectable } from '@nestjs/common';
import { ComicIssueService } from '../comic-issue/comic-issue.service';
import { ActionSpecGetResponse } from './dto/types';
import { s3Service } from '../aws/s3.service';
import {
  Comic,
  ComicIssue,
  StatelessCover,
  WhiteListType,
} from '@prisma/client';
import { isNumberString } from 'class-validator';
import { SOL_ADDRESS } from '../constants';
import { toSol } from '../utils/helpers';

@Injectable()
export class BlinkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly comicIssueService: ComicIssueService,
    private readonly s3: s3Service,
  ) {}

  async getMintActionSpec(id: string): Promise<ActionSpecGetResponse> {
    const isIssueId = isNumberString(id);

    let data: ComicIssue & { comic: Comic; statelessCovers: StatelessCover[] };
    if (isIssueId) {
      data = await this.prisma.comicIssue.findUnique({
        where: { id: +id },
        include: { statelessCovers: true, comic: true },
      });
    } else {
      const key = id.split('_');
      const [comicSlug, slug] = key;

      data = await this.prisma.comicIssue.findFirst({
        where: { comicSlug, slug },
        include: { statelessCovers: true, comic: true },
      });
    }

    const { comic, statelessCovers, ...comicIssue } = data;
    if (!comicIssue) {
      throw new Error('No such comic issue exists');
    }
    const activeCandyMachine =
      await this.comicIssueService.findActiveCandyMachine(comicIssue.id);

    if (!activeCandyMachine) {
      throw new Error('No active mint for this issue');
    }

    const publicSolGroup = await this.prisma.candyMachineGroup.findFirst({
      where: {
        candyMachineAddress: activeCandyMachine,
        whiteListType: WhiteListType.Public,
        splTokenAddress: SOL_ADDRESS,
      },
    });
    const defaultCover = statelessCovers.find((cover) => cover.isDefault);
    const actionEndpoint = `${process.env.API_URL}/transaction/blink/mint/${activeCandyMachine}`;
    const mintPrice = toSol(Number(publicSolGroup.mintPrice));

    return {
      icon: this.s3.getPublicUrl(defaultCover.image),
      title: `${comic.title} - ${comicIssue.title}`,
      description: comicIssue.description,
      label: 'Mint',
      links: {
        actions: [
          { label: `Mint for ~ ${mintPrice} SOL`, href: actionEndpoint },
        ],
      },
    };
  }
}
