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
import { isEmpty, isNil } from 'lodash';
import { ComicPageService } from '../comic-page/comic-page.service';
import { Prisma, ComicIssue, ComicPage, Comic, Creator } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ComicIssueFilterParams } from './dto/comic-issue-filter-params.dto';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { WalletComicIssueService } from './wallet-comic-issue.service';
import { subDays } from 'date-fns';
import { PublishOnChainDto } from './dto/publish-on-chain.dto';
import { s3Service } from '../aws/s3.service';
import { filterBy, getQueryFilters } from '../utils/query-helpers';

@Injectable()
export class ComicIssueService {
  constructor(
    private readonly s3: s3Service,
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
    const { slug, comicSlug, sellerFee, pages, ...rest } = createComicIssueDto;
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
          sellerFeeBasisPoints: sellerFee * 100,
          comic: { connect: { slug: comicSlug } },
          pages: { createMany: { data: pagesData } },
        },
      });
    } catch {
      throw new BadRequestException('Bad comic issue data');
    }

    const { cover, signedCover, usedCover, usedSignedCover } =
      createComicIssueFilesDto;
    // Upload files if any
    let coverKey: string,
      signedCoverKey: string,
      usedCoverKey: string,
      usedSignedCoverKey: string;
    try {
      const prefix = await this.getS3FilePrefix(comicIssue.id);
      if (cover) coverKey = await this.s3.uploadFile(prefix, cover);
      if (signedCover)
        signedCoverKey = await this.s3.uploadFile(prefix, signedCover);
      if (usedCover) usedCoverKey = await this.s3.uploadFile(prefix, usedCover);
      if (usedSignedCover)
        usedSignedCoverKey = await this.s3.uploadFile(prefix, usedSignedCover);
    } catch {
      throw new BadRequestException('Malformed file upload');
    }

    // Update Comic Issue with s3 file keys
    comicIssue = await this.prisma.comicIssue.update({
      where: { id: comicIssue.id },
      include: { pages: true },
      data: {
        cover: coverKey,
        signedCover: signedCoverKey,
        usedCover: usedCoverKey,
        usedSignedCover: usedSignedCoverKey,
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
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      },
      select: { address: true },
    });

    return candyMachine?.address;
  }

  async findAll(query: ComicIssueFilterParams) {
    const {
      titleCondition,
      comicSlugCondition,
      creatorWhereCondition,
      genreSlugsCondition,
      sortColumn,
      sortOrder,
    } = getQueryFilters(query);

    const comicIssues = await this.prisma.$queryRaw<
      (ComicIssue & {
        comic: Comic & { creator: Creator };
        collectionNft: { address: string };
        averagerating: number;
        raterscount: number;
        favouritescount: number;
        readerscount: number;
        viewerscount: number;
        totalissuescount: number;
        totalpagescount: number;
      })[]
    >(
      Prisma.sql`SELECT "ci"."id", "ci"."number", "ci"."supply", "ci"."discountMintPrice", "ci"."mintPrice", "ci"."sellerFeeBasisPoints", "ci"."title", "ci"."slug", "ci"."description", "ci"."flavorText", "ci"."cover", "ci"."releaseDate", "ci"."publishedAt", "ci"."popularizedAt", "ci"."verifiedAt", "ci"."deletedAt",
      AVG("wci"."rating") AS averageRating,
      SUM(case when "wci"."rating" is not null then 1 end) as ratersCount,
      SUM(case when "wci"."isFavourite" then 1 end) AS favouritesCount,
      SUM(case when "wci"."readAt" is not null then 1 end) AS readersCount,
      SUM(case when "wci"."viewedAt" is not null then 1 end) AS viewersCount,
      (
        SELECT COUNT(*) as totalIssuesCount
        FROM "ComicIssue" ci2
        where "ci2"."comicSlug"  = "ci"."comicSlug"
      ) AS totalIssuesCount,
      (
        SELECT COUNT(*) as totalPagesCount
        FROM "ComicPage" cp
        where "cp"."comicIssueId" = "ci"."id"
      ) AS totalPagesCount
      FROM "ComicIssue" ci
      INNER JOIN "Comic" c ON "c"."slug" = "ci"."comicSlug"
      INNER JOIN "Creator" cr ON "cr"."id" = "c"."creatorId"
      INNER JOIN "WalletComicIssue" wci ON "wci"."comicIssueId" = "ci"."id"
      INNER JOIN "_ComicToGenre" ctg ON "ctg"."A" = "c"."slug"
      LEFT JOIN "CollectionNft" cn ON "cn"."comicIssueId" = "ci"."id"
      WHERE "ci"."deletedAt" IS NULL AND "ci"."publishedAt" < NOW() AND "ci"."verifiedAt" IS NOT NULL AND "c"."deletedAt" IS NULL
      ${filterBy(query.tag)}
      ${titleCondition}
      ${comicSlugCondition}
      ${creatorWhereCondition}
      ${genreSlugsCondition}
      GROUP BY "ci"."id"
      ORDER BY ${sortColumn} ${sortOrder}
      OFFSET ${query.skip}
      LIMIT ${query.take}
      ;`,
    );

    const response = await Promise.all(
      comicIssues.map(async (issue) => {
        return {
          ...issue,
          stats: {
            favouritesCount: Number(issue.favouritescount),
            ratersCount: Number(issue.raterscount),
            averageRating: Number(issue.averagerating),
            price: await this.walletComicIssueService.getComicIssuePrice(issue),
            totalIssuesCount: Number(issue.totalissuescount),
            readersCount: Number(issue.readerscount),
            viewersCount: Number(issue.viewerscount),
            totalPagesCount: Number(issue.totalpagescount),
          },
        };
      }),
    );
    return response;
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

    // TODO: make this a non-blocking query
    await this.read(comicIssueId, walletAddress);

    return this.comicPageService.findAll(comicIssueId, showPreviews);
  }

  async update(id: number, updateComicIssueDto: UpdateComicIssueDto) {
    const { pages, sellerFee, ...rest } = updateComicIssueDto;
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
          sellerFeeBasisPoints: isNil(sellerFee) ? undefined : sellerFee * 100,
          // TODO v2: check if pagesData = undefined will destroy all previous relations
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
    const newFileKey = await this.s3.uploadFile(prefix, file);

    try {
      comicIssue = await this.prisma.comicIssue.update({
        where: { id, publishedAt: null },
        include: { pages: true },
        data: { [file.fieldname]: newFileKey },
      });
    } catch {
      await this.s3.deleteObject({ Key: newFileKey });
      throw new BadRequestException(
        'Malformed file upload or Comic issue already published',
      );
    }

    if (oldFileKey !== newFileKey) {
      await this.s3.deleteObject({ Key: oldFileKey });
    }

    return comicIssue;
  }

  async publishOnChain(id: number, publishOnChainDto: PublishOnChainDto) {
    const comicIssue = await this.prisma.comicIssue.findUnique({
      where: { id, deletedAt: null },
      include: { collectionNft: true },
    });

    if (!comicIssue) {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    } else if (!!comicIssue.publishedAt) {
      // throw new BadRequestException('Comic issue already published');
    } else if (!!comicIssue.collectionNft) {
      throw new BadRequestException('Comic issue already on chain');
    } else if (publishOnChainDto.supply < 1) {
      throw new BadRequestException('Supply must be greater than 0');
    } else if (
      publishOnChainDto.sellerFee <= 0 ||
      publishOnChainDto.sellerFee >= 1
    ) {
      throw new BadRequestException('Seller fee must be in range of 0-100%');
    }

    this.validatePrice(publishOnChainDto);

    const { sellerFee, ...updatePayload } = publishOnChainDto;
    const sellerFeeBasisPoints = isNil(sellerFee) ? undefined : sellerFee * 100;
    const updatedComicIssue = await this.prisma.comicIssue.update({
      where: { id },
      data: { publishedAt: new Date(), sellerFeeBasisPoints, ...updatePayload },
      include: { comic: { include: { creator: true } }, collectionNft: true },
    });

    try {
      await this.candyMachineService.createComicIssueCM(
        updatedComicIssue,
        updatedComicIssue.comic.name,
        updatedComicIssue.comic.creator.walletAddress,
      );
    } catch (e) {
      // revert in case of failure
      await this.prisma.comicIssue.update({
        where: { id },
        data: {
          publishedAt: comicIssue.publishedAt,
          supply: comicIssue.supply,
          mintPrice: comicIssue.mintPrice,
          discountMintPrice: comicIssue.discountMintPrice,
          sellerFeeBasisPoints: comicIssue.sellerFeeBasisPoints,
        },
      });
      throw e;
    }

    return updatedComicIssue;
  }

  async publish(id: number) {
    const comicIssue = await this.prisma.comicIssue.findUnique({
      where: { id, deletedAt: null },
      include: { comic: { include: { creator: true } }, collectionNft: true },
    });

    if (!comicIssue) {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    } else if (!!comicIssue.publishedAt) {
      throw new BadRequestException('Comic already published');
    }

    // if supply is 0 we are creating an offchain (web2) comic issue
    if (comicIssue.supply > 0) {
      await this.candyMachineService.createComicIssueCM(
        comicIssue,
        comicIssue.comic.name,
        comicIssue.comic.creator.walletAddress,
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
    const keys = await this.s3.listFolderKeys({ Prefix: prefix });
    await this.s3.deleteObjects(keys);

    try {
      await this.prisma.comicIssue.delete({ where: { id, publishedAt: null } });
    } catch {
      throw new NotFoundException(
        `Comic issue with id ${id} does not exist or is published`,
      );
    }
  }

  validatePrice(
    comicIssue: CreateComicIssueDto | UpdateComicIssueDto | PublishOnChainDto,
  ) {
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
    } else if (comicIssue.discountMintPrice < 0 || comicIssue.mintPrice < 0) {
      throw new BadRequestException(
        'Mint prices must be greater than or equal to 0',
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
