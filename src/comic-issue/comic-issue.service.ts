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
import { isNil } from 'lodash';
import { ComicPageService } from '../comic-page/comic-page.service';
import {
  Prisma,
  ComicIssue,
  ComicPage,
  Comic,
  AudienceType,
  StatelessCover,
} from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ComicIssueFilterParams } from './dto/comic-issue-filter-params.dto';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { WalletComicIssueService } from './wallet-comic-issue.service';
import { subDays } from 'date-fns';
import { PublishOnChainDto } from './dto/publish-on-chain.dto';
import { s3Service } from '../aws/s3.service';
import { PickFields } from '../types/shared';
import { getRarityShare } from '../constants';
import { CreateStatelessCoverDto } from './dto/covers/create-stateless-cover.dto';
import { CreateStatefulCoverDto } from './dto/covers/create-stateful-cover.dto';
import { getComicIssuesQuery } from './comic-issue.queries';
import { ComicIssueStats } from '../comic/types/comic-issue-stats';
import { ComicIssueInput } from './dto/comic-issue.dto';
import { validatePrice, validateWeb3PublishInfo } from '../utils/comic-issue';

const getS3Folder = (comicSlug: string, comicIssueSlug: string) =>
  `comics/${comicSlug}/issues/${comicIssueSlug}/`;
type ComicIssueFileProperty = PickFields<ComicIssue, 'signature' | 'pdf'>;

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
    const { slug, comicSlug, sellerFee, ...rest } = createComicIssueDto;
    validatePrice(createComicIssueDto);

    const parentComic = await this.prisma.comic.findUnique({
      where: { slug: comicSlug },
    });

    if (!parentComic) {
      throw new NotFoundException(`Comic ${comicSlug} does not exist`);
    }

    // make sure creator of the comic issue owns the parent comic as well
    if (parentComic.creatorId !== creatorId) throw new ImATeapotException();

    let comicIssue: ComicIssue & { pages: ComicPage[] };

    try {
      comicIssue = await this.prisma.comicIssue.create({
        include: { pages: true },
        data: {
          ...rest,
          slug,
          sellerFeeBasisPoints: sellerFee * 100,
          comic: { connect: { slug: comicSlug } },
          collaborators: {
            createMany: { data: createComicIssueDto.collaborators },
          },
        },
      });
    } catch {
      throw new BadRequestException('Bad comic issue data');
    }

    const { signature, pdf } = createComicIssueFilesDto;
    // upload files if any
    let signatureKey: string, pdfKey: string;
    try {
      const s3Folder = getS3Folder(comicIssue.comicSlug, comicIssue.slug);
      if (pdf) pdfKey = await this.s3.uploadFile(s3Folder, pdf, 'pdf');
      if (signature)
        signatureKey = await this.s3.uploadFile(
          s3Folder,
          signature,
          'signature',
        );
    } catch {
      throw new BadRequestException('Malformed file upload');
    }

    return await this.prisma.comicIssue.update({
      where: { id: comicIssue.id },
      include: { pages: true, collaborators: true },
      data: {
        signature: signatureKey,
        pdf: pdfKey,
      },
    });
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

  async findAll(query: ComicIssueFilterParams): Promise<ComicIssueInput[]> {
    const comicIssues = await this.prisma.$queryRaw<
      Array<
        ComicIssue & {
          comic: Comic;
          statelessCovers: StatelessCover;
          comicName: string;
          audienceType: AudienceType;
          creatorName: string;
          creatorSlug: string;
          creatorVerifiedAt?: string;
          creatorAvatar?: string;
        } & ComicIssueStats
      >
    >(getComicIssuesQuery(query));

    const response = await Promise.all(
      comicIssues.map(async (issue) => {
        const statelessCovers = await this.prisma.statelessCover.findMany({
          where: { comicIssueId: issue.id },
        });
        const price = await this.walletComicIssueService.getComicIssuePrice(
          issue,
        );

        return {
          comic: {
            name: issue.comicName,
            slug: issue.comicSlug,
            audienceType: issue.audienceType,
            creator: {
              name: issue.creatorName,
              slug: issue.creatorSlug,
              isVerified: !!issue.verifiedAt,
              avatar: issue.creatorAvatar,
            },
          },
          ...issue,
          statelessCovers,
          stats: {
            favouritesCount: Number(issue.favouritesCount),
            ratersCount: Number(issue.ratersCount),
            averageRating: Number(issue.averageRating),
            totalIssuesCount: Number(issue.totalIssuesCount),
            readersCount: Number(issue.readersCount),
            viewersCount: Number(issue.viewersCount),
            totalPagesCount: Number(issue.totalPagesCount),
            price,
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
        collaborators: true,
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

    await this.read(comicIssueId, walletAddress);
    return this.comicPageService.findAll(comicIssueId, showPreviews);
  }

  async update(id: number, updateComicIssueDto: UpdateComicIssueDto) {
    const { sellerFee, ...rest } = updateComicIssueDto;
    validatePrice(updateComicIssueDto);

    try {
      const updatedComicIssue = await this.prisma.comicIssue.update({
        where: { id, publishedAt: null },
        data: {
          ...rest,
          sellerFeeBasisPoints: isNil(sellerFee) ? undefined : sellerFee * 100,
          collaborators: undefined, // TODO v1: replace current collaborators (meditate on this one)
        },
      });

      return updatedComicIssue;
    } catch {
      throw new NotFoundException(
        `Comic issue with id ${id} does not exist or is published`,
      );
    }
  }

  async updateFile(
    id: number,
    file: Express.Multer.File,
    field: ComicIssueFileProperty,
  ) {
    let comicIssue: ComicIssue & { pages: ComicPage[] };
    try {
      comicIssue = await this.prisma.comicIssue.findUnique({
        where: { id },
        include: { pages: true },
      });
    } catch {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    }

    const s3Folder = getS3Folder(comicIssue.comicSlug, comicIssue.slug);
    const oldFileKey = comicIssue[field];
    const newFileKey = await this.s3.uploadFile(s3Folder, file, field);

    try {
      comicIssue = await this.prisma.comicIssue.update({
        where: { id, publishedAt: null },
        include: { pages: true },
        data: { [field]: newFileKey },
      });
    } catch {
      await this.s3.deleteObject(newFileKey);
      throw new BadRequestException(
        'Malformed file upload or Comic issue already published',
      );
    }

    await this.s3.garbageCollectOldFile(newFileKey, oldFileKey);
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
    }

    validateWeb3PublishInfo(publishOnChainDto);
    validatePrice(publishOnChainDto);

    const { sellerFee, ...updatePayload } = publishOnChainDto;
    const sellerFeeBasisPoints = isNil(sellerFee) ? undefined : sellerFee * 100;
    const updatedComicIssue = await this.prisma.comicIssue.update({
      where: { id },
      data: { publishedAt: new Date(), sellerFeeBasisPoints, ...updatePayload },
      include: {
        comic: { include: { creator: true } },
        collectionNft: true,
        statefulCovers: true,
        statelessCovers: true,
        collaborators: true,
      },
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
      include: {
        comic: { include: { creator: true } },
        collectionNft: true,
        statefulCovers: true,
        statelessCovers: true,
        collaborators: true,
      },
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
      include: { collaborators: true },
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

  /** upload many stateless cover images to S3 and format data for INSERT */
  async createManyStatelessCoversData(
    covers: CreateStatelessCoverDto[],
    comicIssue: ComicIssue,
  ) {
    const s3Folder = getS3Folder(comicIssue.comicSlug, comicIssue.slug);
    return await Promise.all(
      covers.map(
        async (cover): Promise<Prisma.StatelessCoverCreateManyInput> => {
          const imageKey = await this.s3.uploadFile(s3Folder, cover.image);
          return {
            image: imageKey,
            rarity: cover.rarity,
            artist: cover.artist,
            isDefault: cover.isDefault,
            share: cover.share ?? getRarityShare(covers.length, cover.rarity),
            comicIssueId: comicIssue.id,
          };
        },
      ),
    );
  }

  /** upload many stateful cover images to S3 and format data for INSERT */
  async createManyStatefulCoversData(
    covers: CreateStatefulCoverDto[],
    comicIssue: ComicIssue,
  ) {
    const s3Folder = getS3Folder(comicIssue.comicSlug, comicIssue.slug);
    return await Promise.all(
      covers.map(
        async (cover): Promise<Prisma.StatefulCoverCreateManyInput> => {
          const imageKey = await this.s3.uploadFile(s3Folder, cover.image);
          return {
            image: imageKey,
            rarity: cover.rarity,
            artist: cover.artist,
            isUsed: cover.isUsed,
            isSigned: cover.isSigned,
            comicIssueId: comicIssue.id,
          };
        },
      ),
    );
  }

  async updateStatelessCovers(
    statelessCoversDto: CreateStatelessCoverDto[],
    comicIssueId: number,
  ) {
    const comicIssue = await this.prisma.comicIssue.findUnique({
      where: { id: comicIssueId },
      include: { statelessCovers: true },
    });
    const oldStatelessCovers = comicIssue.statelessCovers;

    // upload stateless covers to S3 and format data for INSERT
    const newStatelessCoversData = await this.createManyStatelessCoversData(
      statelessCoversDto,
      comicIssue,
    );

    try {
      await this.prisma.statelessCover.createMany({
        data: newStatelessCoversData,
      });
    } catch (e) {
      const keys = newStatelessCoversData.map((cover) => cover.image);
      await this.s3.deleteObjects(keys);
      throw e;
    }

    if (!!oldStatelessCovers.length) {
      const keys = oldStatelessCovers.map((cover) => cover.image);
      await this.s3.deleteObjects(keys);
    }
  }

  async updateStatefulCovers(
    statefulCoversDto: CreateStatefulCoverDto[],
    comicIssueId: number,
  ) {
    const comicIssue = await this.prisma.comicIssue.findUnique({
      where: { id: comicIssueId },
      include: { statefulCovers: true },
    });
    const oldStatefulCovers = comicIssue.statefulCovers;

    // upload stateful covers to S3 and format data for INSERT
    const newStatefulCoversData = await this.createManyStatefulCoversData(
      statefulCoversDto,
      comicIssue,
    );

    try {
      await this.prisma.statefulCover.createMany({
        data: newStatefulCoversData,
      });
    } catch (e) {
      const keys = newStatefulCoversData.map((cover) => cover.image);
      await this.s3.deleteObjects(keys);
      throw e;
    }

    if (!!oldStatefulCovers.length) {
      const keys = oldStatefulCovers.map((cover) => cover.image);
      await this.s3.deleteObjects(keys);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async clearComicIssuesQueuedForRemoval() {
    const where = { where: { deletedAt: { lte: subDays(new Date(), 30) } } };
    const comicIssuesToRemove = await this.prisma.comicIssue.findMany(where);
    await this.prisma.comicIssue.deleteMany(where);

    for (const comicIssue of comicIssuesToRemove) {
      const s3Folder = getS3Folder(comicIssue.comicSlug, comicIssue.slug);
      await this.s3.deleteFolder(s3Folder);
    }
  }
}
