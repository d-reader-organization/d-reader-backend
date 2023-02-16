import {
  BadRequestException,
  ImATeapotException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import {
  CreateComicIssueDto,
  CreateComicIssueFilesDto,
} from './dto/create-comic-issue.dto';
import { UpdateComicIssueDto } from './dto/update-comic-issue.dto';
import {
  deleteS3Object,
  deleteS3Objects,
  listS3FolderKeys,
  uploadFile,
} from '../aws/s3client';
import { isEmpty } from 'lodash';
import { ComicPageService } from 'src/comic-page/comic-page.service';
import { Prisma, ComicIssue, ComicPage } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ComicIssueFilterParams } from './dto/comic-issue-filter-params.dto';
import { CandyMachineService } from 'src/vendors/candy-machine.service';
import { subDays } from 'date-fns';
import { WalletComicIssueService } from './wallet-comic-issue.service';

@Injectable()
export class ComicIssueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly comicPageService: ComicPageService,
    private readonly candyMachineService: CandyMachineService,
    private readonly walletComicIssueService: WalletComicIssueService,
  ) {}

  async create(
    creatorId: number,
    createComicIssueDto: CreateComicIssueDto,
    createComicIssueFilesDto: CreateComicIssueFilesDto,
  ) {
    const { slug, comicSlug, pages, ...rest } = createComicIssueDto;

    const parentComic = await this.prisma.comic.findUnique({
      where: { slug: comicSlug },
    });

    if (!parentComic) {
      throw new NotFoundException(`Comic ${comicSlug} does not exist`);
    }

    // Make sure creator of the comic issue owns the parent comic as well
    if (parentComic.creatorId !== creatorId) throw new ImATeapotException();

    // Create ComicIssue without any files uploaded
    let comicIssue: ComicIssue & { pages: ComicPage[] };

    // Upload comic pages and format data for INSERT
    const pagesData = await this.comicPageService.createMany(pages);
    try {
      comicIssue = await this.prisma.comicIssue.create({
        include: { pages: true },
        data: {
          ...rest,
          slug,
          comic: { connect: { slug: comicSlug } },
          pages: { createMany: { data: pagesData } },
        },
      });
    } catch {
      throw new BadRequestException('Bad comic issue data');
    }

    const { cover, soundtrack } = createComicIssueFilesDto;

    // Upload files if any
    let coverKey: string, soundtrackKey: string;
    try {
      const prefix = await this.getS3FilePrefix(comicIssue.id);
      if (cover) coverKey = await uploadFile(prefix, cover);
      if (soundtrack) soundtrackKey = await uploadFile(prefix, soundtrack);
    } catch {
      throw new BadRequestException('Malformed file upload');
    }

    // Update Comic Issue with s3 file keys
    comicIssue = await this.prisma.comicIssue.update({
      where: { id: comicIssue.id },
      include: { pages: true },
      data: {
        cover: coverKey,
        soundtrack: soundtrackKey,
      },
    });

    return comicIssue;
  }

  async findAll(query: ComicIssueFilterParams) {
    const comicIssues = await this.prisma.comicIssue.findMany({
      include: { comic: { include: { creator: true } } },
      skip: query.skip,
      take: query.take,
      where: {
        title: { contains: query?.titleSubstring, mode: 'insensitive' },
        comicSlug: { equals: query?.comicSlug },
        deletedAt: null,
        publishedAt: { lt: new Date() },
        verifiedAt: { not: null },
        comic: {
          creator: { slug: query?.creatorSlug },
          deletedAt: null,
          AND: query?.genreSlugs?.map((slug) => {
            return {
              genres: {
                some: {
                  slug: {
                    equals: slug,
                    mode: 'insensitive',
                  },
                },
              },
            };
          }),
        },
      },
    });

    return comicIssues;
  }

  async findOne(id: number) {
    const comicIssue = await this.prisma.comicIssue.findFirst({
      include: {
        pages: true,
        comic: { include: { creator: true } },
      },
      where: { id },
    });

    if (!comicIssue) {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    }

    return comicIssue;
  }

  async findOneProtected(id: number, walletAddress: string) {
    let showOnlyPreviews: boolean | undefined;

    // find all NFTs that token gate the comic issue and are owned by the wallet
    const ownedComicIssues = await this.prisma.comicIssueNft.findMany({
      where: { collectionNft: { comicIssueId: id }, owner: walletAddress },
    });

    // if wallet does not own the issue, see if it's whitelisted per comic issue basis
    if (ownedComicIssues.length === 0) {
      const walletComicIssue = await this.prisma.walletComicIssue.findFirst({
        where: { walletAddress, comicIssueId: id, isWhitelisted: true },
      });

      // if wallet does not own the issue, see if it's whitelisted per comic basis
      if (!walletComicIssue) {
        const walletComic = await this.prisma.walletComic.findFirst({
          where: {
            walletAddress,
            comic: { issues: { some: { id } } },
            isWhitelisted: true,
          },
        });

        // if wallet is still not allowed to view the full content of the issue
        // make sure to show only preview pages of the comic
        if (!walletComic) showOnlyPreviews = true;
      }
    }

    const comicIssue = await this.prisma.comicIssue.findFirst({
      where: { id },
      include: {
        pages: { where: { isPreviewable: showOnlyPreviews } },
        comic: { include: { creator: true } },
      },
    });

    if (!comicIssue) {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    }
    const { stats, myStats } = await this.walletComicIssueService.aggregateAll(
      id,
      comicIssue.comicSlug,
      walletAddress,
    );
    await this.walletComicIssueService.refreshDate(
      walletAddress,
      id,
      'viewedAt',
    );
    return { ...comicIssue, stats, myStats };
  }

  async update(id: number, updateComicIssueDto: UpdateComicIssueDto) {
    const { pages, ...rest } = updateComicIssueDto;

    // Delete old comic pages
    let pagesData: Prisma.ComicPageCreateManyComicIssueInput[];
    if (!isEmpty(pages)) {
      await this.comicPageService.deleteComicPages({ comicIssue: { id } });

      // Upload new comic pages and format data for nested INSERT
      pagesData = await this.comicPageService.createMany(pages);
    }

    let updatedComicIssue: ComicIssue;
    try {
      updatedComicIssue = await this.prisma.comicIssue.update({
        where: { id },
        include: { pages: true },
        data: {
          ...rest,
          // TODO v1.2: check if pagesData = undefined will destroy all previous relations
          pages: { createMany: { data: pagesData } },
        },
      });
    } catch {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    }

    return updatedComicIssue;
  }

  async updateFile(id: number, file: Express.Multer.File) {
    let comicIssue: ComicIssue;
    try {
      comicIssue = await this.prisma.comicIssue.findUnique({
        where: { id },
        include: { pages: true },
      });
    } catch {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    }

    const oldFileKey = comicIssue[file.fieldname];
    const prefix = await this.getS3FilePrefix(id);
    const newFileKey = await uploadFile(prefix, file);

    try {
      comicIssue = await this.prisma.comicIssue.update({
        where: { id },
        include: { pages: true },
        data: { [file.fieldname]: newFileKey },
      });
    } catch {
      await deleteS3Object({ Key: newFileKey });
      throw new BadRequestException('Malformed file upload');
    }

    if (oldFileKey !== newFileKey) {
      await deleteS3Object({ Key: oldFileKey });
    }

    return comicIssue;
  }

  async publish(id: number) {
    const comicIssue = await this.prisma.comicIssue.findUnique({
      where: { id },
    });

    if (!comicIssue) {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    }

    const comic = await this.prisma.comic.findFirst({
      where: { slug: comicIssue.comicSlug },
    });
    const creator = await this.prisma.creator.findUnique({
      where: { id: comic.creatorId },
    });

    await this.candyMachineService.createComicIssueCM(
      comic,
      comicIssue,
      creator,
    );

    return await this.prisma.comicIssue.update({
      where: { id },
      data: { publishedAt: new Date() },
    });
  }

  async unpublish(id: number) {
    try {
      return await this.prisma.comicIssue.update({
        where: { id },
        data: { publishedAt: null },
      });
    } catch {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    }
  }

  async read(id: number, walletAddress: string): Promise<void> {
    await this.walletComicIssueService.refreshDate(walletAddress, id, 'readAt');
  }

  async pseudoDelete(id: number) {
    try {
      return await this.prisma.comicIssue.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } catch {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    }
  }

  async pseudoRecover(id: number) {
    try {
      return await this.prisma.comicIssue.update({
        where: { id },
        data: { deletedAt: null },
      });
    } catch {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    }
  }

  async remove(id: number) {
    // Remove s3 assets
    const prefix = await this.getS3FilePrefix(id);
    const keys = await listS3FolderKeys({ Prefix: prefix });

    if (!isEmpty(keys)) {
      await deleteS3Objects({
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      });
    }

    try {
      await this.prisma.comicIssue.delete({ where: { id } });
    } catch {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    }
  }

  async getS3FilePrefix(id: number) {
    const comicIssue = await this.prisma.comicIssue.findUnique({
      where: { id },
      select: {
        slug: true,
        comic: { select: { slug: true, creator: { select: { slug: true } } } },
      },
    });

    if (!comicIssue) {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    }

    const prefix = `creators/${comicIssue.comic.creator.slug}/comics/${comicIssue.comic.slug}/issues/${comicIssue.slug}/`;
    return prefix;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async clearComicIssuesQueuedForRemoval() {
    const comicIssuesToRemove = await this.prisma.comicIssue.findMany({
      where: { deletedAt: { lte: subDays(new Date(), 30) } }, // 30 days ago
    });

    for (const comicIssue of comicIssuesToRemove) {
      await this.remove(comicIssue.id);
      console.log(`Removed comic issue ${comicIssue.id} at ${new Date()}`);
    }
  }
}
