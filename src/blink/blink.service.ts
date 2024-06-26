import { PrismaService } from 'nestjs-prisma';
import { Injectable } from '@nestjs/common';
import { ComicIssueService } from 'src/comic-issue/comic-issue.service';
import { ActionSpecGetResponse } from './dto/types';
import { s3Service } from 'src/aws/s3.service';
import { Comic, ComicIssue, StatelessCover } from '@prisma/client';
import { isNumberString } from 'class-validator';

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
    const defaultCover = statelessCovers.find((cover) => cover.isDefault);
    const actionEndpoint = `${process.env.API_URL}/transaction/blink/mint/${activeCandyMachine}`;

    return {
      icon: this.s3.getPublicUrl(defaultCover.image),
      title: `${comic.title} - ${comicIssue.title}`,
      description: comicIssue.description,
      label: 'Mint',
      links: {
        actions: [{ label: 'Mint', href: actionEndpoint }],
      },
    };
  }
}
