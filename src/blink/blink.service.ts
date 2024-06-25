import { PrismaService } from 'nestjs-prisma';
import { Injectable } from '@nestjs/common';
import { ComicIssueService } from 'src/comic-issue/comic-issue.service';
import { ActionSpecGetResponse } from './dto/types';
import { s3Service } from 'src/aws/s3.service';

@Injectable()
export class BlinkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly comicIssueService: ComicIssueService,
    private readonly s3: s3Service,
  ) {}

  async getMintActionSpec(id: number): Promise<ActionSpecGetResponse> {
    const comicIssue = await this.prisma.comicIssue.findUnique({
      where: { id },
      include: { statelessCovers: true },
    });
    if (!comicIssue) {
      throw new Error('No such comic issue exists');
    }
    const activeCandyMachine =
      await this.comicIssueService.findActiveCandyMachine(id);

    if (!activeCandyMachine) {
      throw new Error('No active mint for this issue');
    }
    const defaultCover = comicIssue.statelessCovers.find(
      (cover) => cover.isDefault,
    );
    const actionEndpoint = `${process.env.API_URL}/transaction/blink/mint/${activeCandyMachine}`;

    return {
      icon: this.s3.getPublicUrl(defaultCover.image),
      title: `Mint ${comicIssue.title}`,
      description: comicIssue.description,
      label: 'Mint',
      links: {
        actions: [{ label: 'Mint', href: actionEndpoint }],
      },
    };
  }
}
