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
import { CandyMachineService } from 'src/candy-machine/candy-machine.service';
import { WalletComicIssueService } from './wallet-comic-issue.service';
import { subDays } from 'date-fns';

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
    this.validatePrice(createComicIssueDto);

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

  async findActiveCandyMachine(
    collectionNftAddress: string,
  ): Promise<string | undefined> {
    if (!collectionNftAddress) return undefined;

    const candyMachine = await this.prisma.candyMachine.findFirst({
      where: {
        collectionNftAddress,
        itemsRemaining: { gt: 0 },
        endsAt: { gt: new Date() },
      },
      select: { address: true },
    });

    return candyMachine?.address;
  }

  async findAll(query: ComicIssueFilterParams) {
    const comicIssues = await this.prisma.comicIssue.findMany({
      include: {
        comic: { include: { creator: true } },
        collectionNft: { select: { address: true } },
      },
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

    return await Promise.all(
      comicIssues.map(async (issue) => {
        return {
          ...issue,
          stats: await this.walletComicIssueService.aggregateComicIssueStats(
            issue,
          ),
        };
      }),
    );
  }

  async findOne(id: number, walletAddress: string) {
    const comicIssue = await this.prisma.comicIssue.findFirst({
      where: { id },
      include: {
        comic: { include: { creator: true } },
        collectionNft: { select: { address: true } },
      },
    });

    if (!comicIssue) {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    }

    const findActiveCandyMachine = await this.findActiveCandyMachine(
      comicIssue.collectionNft?.address,
    );

    const aggregateStats = await this.walletComicIssueService.aggregateAll(
      comicIssue,
      walletAddress,
    );

    const checkShouldShowPreviews =
      await this.walletComicIssueService.shouldShowPreviews(id, walletAddress);

    await this.walletComicIssueService.refreshDate(
      walletAddress,
      id,
      'viewedAt',
    );

    const [candyMachineAddress, { stats, myStats }, showOnlyPreviews] =
      await Promise.all([
        findActiveCandyMachine,
        aggregateStats,
        checkShouldShowPreviews,
      ]);

    return {
      ...comicIssue,
      stats,
      myStats: { ...myStats, canRead: !showOnlyPreviews },
      candyMachineAddress,
    };
  }

  async getPages(comicIssueId: number, walletAddress: string) {
    const showPreviews = await this.walletComicIssueService.shouldShowPreviews(
      comicIssueId,
      walletAddress,
    );

    return this.comicPageService.findAll(comicIssueId, showPreviews);
  }

  async update(id: number, updateComicIssueDto: UpdateComicIssueDto) {
    const { pages, ...rest } = updateComicIssueDto;
    this.validatePrice(updateComicIssueDto);

    let updatedComicIssue: ComicIssue & { pages: ComicPage[] };
    try {
      updatedComicIssue = await this.prisma.comicIssue.findUnique({
        where: { id, publishedAt: null },
        include: { pages: true },
      });
    } catch {
      throw new NotFoundException(
        `Comic issue with id ${id} does not exist or is published`,
      );
    }

    // Delete old comic pages
    let pagesData: Prisma.ComicPageCreateManyComicIssueInput[];
    if (!isEmpty(pages)) {
      await this.comicPageService.deleteComicPages({ comicIssue: { id } });

      // Upload new comic pages and format data for nested INSERT
      pagesData = await this.comicPageService.createMany(pages);
    }

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
      throw new BadRequestException('Bad comic issue data');
    }

    return updatedComicIssue;
  }

  async updateFile(id: number, file: Express.Multer.File) {
    let comicIssue: ComicIssue & { pages: ComicPage[] };
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
        where: { id, publishedAt: null },
        include: { pages: true },
        data: { [file.fieldname]: newFileKey },
      });
    } catch {
      await deleteS3Object({ Key: newFileKey });
      throw new BadRequestException(
        'Malformed file upload or Comic issue already published',
      );
    }

    if (oldFileKey !== newFileKey) {
      await deleteS3Object({ Key: oldFileKey });
    }

    return comicIssue;
  }

  async publish(id: number) {
    const comicIssue = await this.prisma.comicIssue.findUnique({
      where: { id, deletedAt: null },
      include: { comic: { include: { creator: true } } },
    });

    if (!comicIssue) {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    } else if (!!comicIssue.publishedAt) {
      throw new BadRequestException('Comic already published');
    }

    // if supply is 0 we are creating an offchain (web2) comic issue
    if (comicIssue.supply > 0) {
      await this.candyMachineService.createComicIssueCM(
        comicIssue.comic,
        comicIssue,
        comicIssue.comic.creator,
      );
    }

    const updatedComicIssue = await this.prisma.comicIssue.update({
      where: { id },
      data: { publishedAt: new Date() },
    });

    return updatedComicIssue;
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
        where: { id, publishedAt: null },
        data: { deletedAt: new Date() },
      });
    } catch {
      throw new NotFoundException(
        `Comic issue with id ${id} does not exist or is published`,
      );
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
      await this.prisma.comicIssue.delete({ where: { id, publishedAt: null } });
    } catch {
      throw new NotFoundException(
        `Comic issue with id ${id} does not exist or is published`,
      );
    }
  }

  validatePrice(comicIssue: CreateComicIssueDto | UpdateComicIssueDto) {
    // if supply is 0, it's a web2 comic which must be FREE
    if (
      (comicIssue.supply === 0 && comicIssue.mintPrice !== 0) ||
      (comicIssue.supply === 0 && comicIssue.discountMintPrice !== 0)
    ) {
      throw new BadRequestException('Offchain Comic issues must be free');
    }

    if (comicIssue.discountMintPrice > comicIssue.mintPrice) {
      throw new BadRequestException(
        'Discount mint price should be lower than base mint price',
      );
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
