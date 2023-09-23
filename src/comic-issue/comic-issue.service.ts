import {
  BadRequestException,
  ImATeapotException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateComicIssueDto } from './dto/create-comic-issue.dto';
import {
  UpdateComicIssueDto,
  UpdateComicIssueFilesDto,
} from './dto/update-comic-issue.dto';
import { isNil } from 'lodash';
import { ComicPageService } from '../comic-page/comic-page.service';
import {
  Prisma,
  ComicIssue,
  ComicPage,
  Comic,
  AudienceType,
  StatelessCover,
  Genre,
} from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ComicIssueParams } from './dto/comic-issue-params.dto';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { UserComicIssueService } from './user-comic-issue.service';
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
import {
  getStatefulCoverName,
  getStatelessCoverName,
  validatePrice,
  validateWeb3PublishInfo,
} from '../utils/comic-issue';
import { OwnedComicIssueInput } from './dto/owned-comic-issue.dto';
import { Metaplex } from '@metaplex-foundation/js';
import { metaplex } from '../utils/metaplex';
import { RawComicIssueParams } from './dto/raw-comic-issue-params.dto';
import { RawComicIssueInput } from './dto/raw-comic-issue.dto';
import { RawComicIssueStats } from '../comic/types/raw-comic-issue-stats';
import { getRawComicIssuesQuery } from './raw-comic-issue.queries';

const getS3Folder = (comicSlug: string, comicIssueSlug: string) =>
  `comics/${comicSlug}/issues/${comicIssueSlug}/`;
type ComicIssueFileProperty = PickFields<ComicIssue, 'signature' | 'pdf'>;

@Injectable()
export class ComicIssueService {
  private readonly metaplex: Metaplex;

  constructor(
    private readonly s3: s3Service,
    private readonly prisma: PrismaService,
    private readonly comicPageService: ComicPageService,
    private readonly candyMachineService: CandyMachineService,
    private readonly userComicIssueService: UserComicIssueService,
  ) {
    this.metaplex = metaplex;
  }

  async create(creatorId: number, createComicIssueDto: CreateComicIssueDto) {
    const {
      slug,
      comicSlug,
      creatorBackupAddress = this.metaplex.identity().publicKey.toBase58(),
      sellerFee = 0,
      collaborators = [],
      royaltyWallets = [],
      ...rest
    } = createComicIssueDto;
    validatePrice(createComicIssueDto);

    // should this comicSlug search be case sensitive or not?
    const parentComic = await this.prisma.comic.findUnique({
      where: { slug: comicSlug },
    });

    if (!parentComic) {
      throw new NotFoundException(`Comic ${comicSlug} does not exist`);
    }

    // make sure creator of the comic issue owns the parent comic as well
    if (parentComic.creatorId !== creatorId) throw new ImATeapotException();

    try {
      const comicIssue = await this.prisma.comicIssue.create({
        include: { pages: true, collaborators: true, statelessCovers: true },
        data: {
          ...rest,
          slug,
          creatorBackupAddress,
          sellerFeeBasisPoints: sellerFee * 100,
          comic: { connect: { slug: comicSlug } },
          collaborators: { createMany: { data: collaborators } },
          royaltyWallets: { createMany: { data: royaltyWallets } },
        },
      });

      return comicIssue;
    } catch {
      throw new BadRequestException('Bad comic issue data');
    }
  }

  async findActiveCandyMachine(
    comicIssueId: number,
  ): Promise<string | undefined> {
    const candyMachine = await this.prisma.candyMachine.findFirst({
      where: {
        collectionNft: { comicIssueId },
        itemsRemaining: { gt: 0 },
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      },
      select: { address: true },
    });

    return candyMachine?.address;
  }

  async findAll(query: ComicIssueParams): Promise<ComicIssueInput[]> {
    const comicIssues = await this.prisma.$queryRaw<
      Array<
        ComicIssue & {
          comic: Comic;
          statelessCovers: StatelessCover;
          comicTitle: string;
          audienceType: AudienceType;
          creatorName: string;
          creatorSlug: string;
          creatorVerifiedAt?: string;
          creatorAvatar?: string;
          genres?: Genre[];
        } & ComicIssueStats
      >
    >(getComicIssuesQuery(query));

    const response = await Promise.all(
      comicIssues.map(async (issue) => {
        const statelessCovers = await this.prisma.statelessCover.findMany({
          where: { comicIssueId: issue.id },
        });
        const price = await this.userComicIssueService.getComicIssuePrice(
          issue,
        );

        return {
          comic: {
            title: issue.comicTitle,
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

  async findAllRaw(query: RawComicIssueParams): Promise<RawComicIssueInput[]> {
    const comicIssues = await this.prisma.$queryRaw<
      Array<
        ComicIssue & {
          genres: Genre[];
          // TODO: is this really fetching statelessCovers? if yes, apply this to 'findAll' as well
          statelessCovers: StatelessCover[];
        } & RawComicIssueStats
      >
    >(getRawComicIssuesQuery(query));

    const normalizedComicIssues = comicIssues.map((issue) => {
      return {
        ...issue,
        stats: {
          favouritesCount: Number(issue.favouritesCount),
          ratersCount: Number(issue.ratersCount),
          averageRating: Number(issue.averageRating),
          readersCount: Number(issue.readersCount),
          viewersCount: Number(issue.viewersCount),
          totalPagesCount: Number(issue.totalPagesCount),
        },
      };
    });

    return normalizedComicIssues;
  }

  async findOne(id: number, userId: number) {
    const findComicIssue = this.prisma.comicIssue.findFirst({
      where: { id },
      include: {
        comic: { include: { creator: true, genres: true } },
        collaborators: true,
        statelessCovers: true,
      },
    });
    const findActiveCandyMachine = this.findActiveCandyMachine(id);
    const getStats = this.userComicIssueService.getComicIssueStats(id);
    const getMyStats = this.userComicIssueService.getUserStats(id, userId);
    const checkCanUserRead = this.userComicIssueService.checkCanUserRead(
      id,
      userId,
    );

    const [comicIssue, candyMachineAddress, stats, myStats, canRead] =
      await Promise.all([
        findComicIssue,
        findActiveCandyMachine,
        getStats,
        getMyStats,
        checkCanUserRead,
      ]);

    if (!comicIssue) {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    }

    return {
      ...comicIssue,
      stats,
      myStats: { ...myStats, canRead },
      candyMachineAddress,
    };
  }

  async findOneRaw(id: number) {
    const findComicIssue = this.prisma.comicIssue.findFirst({
      where: { id },
      include: {
        comic: { include: { genres: true } },
        collaborators: true,
        statelessCovers: true,
        statefulCovers: true,
        royaltyWallets: true,
      },
    });
    const getStats = this.userComicIssueService.getComicIssueStats(id);

    const [comicIssue, stats] = await Promise.all([findComicIssue, getStats]);

    if (!comicIssue) {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    }

    return { ...comicIssue, stats };
  }

  async findAllByOwner(
    query: ComicIssueParams,
    userId: number,
  ): Promise<OwnedComicIssueInput[]> {
    const ownedComicIssues = await this.prisma.comicIssue.findMany({
      distinct: 'title',
      orderBy: { title: 'asc' },
      include: { collectionNft: true, statelessCovers: true },
      where: {
        comicSlug: query.comicSlug,
        collectionNft: {
          collectionItems: { some: { owner: { userId } } },
        },
      },
      skip: query.skip,
      take: query.take,
    });

    return await Promise.all(
      ownedComicIssues.map(async (comicIssue) => {
        const collectionNftAddress = comicIssue.collectionNft.address;
        const ownedCopiesCount = await this.prisma.nft.count({
          where: { collectionNftAddress, owner: { userId } },
        });

        return { ...comicIssue, ownedCopiesCount };
      }),
    );
  }

  async getPages(comicIssueId: number, userId: number) {
    const canRead = await this.userComicIssueService.checkCanUserRead(
      comicIssueId,
      userId,
    );

    // fetch only previewable pages if user can't read the full comic issue
    const isPreviewable = canRead ? undefined : true;

    const getPages = this.comicPageService.findAll(comicIssueId, isPreviewable);
    const readComic = this.read(comicIssueId, userId);
    const [pages] = await Promise.all([getPages, readComic]);

    return pages;
  }

  async update(id: number, updateComicIssueDto: UpdateComicIssueDto) {
    const {
      sellerFee,
      collaborators,
      royaltyWallets,
      creatorBackupAddress = this.metaplex.identity().publicKey.toBase58(),
      ...rest
    } = updateComicIssueDto;

    validatePrice(updateComicIssueDto);

    const isSellerFeeUpdated = !isNil(sellerFee);
    const areCollaboratorsUpdated = !isNil(collaborators);
    const areRoyaltyWalletsUpdated = !isNil(royaltyWallets);

    let sellerFeeBasisPointsData: Prisma.ComicIssueUpdateInput['sellerFeeBasisPoints'];
    if (isSellerFeeUpdated) {
      sellerFeeBasisPointsData = sellerFee * 100;
    }

    if (areCollaboratorsUpdated) {
      const deleteCollaborators = this.prisma.comicIssueCollaborator.deleteMany(
        { where: { comicIssueId: id } },
      );

      const updateCollaborators = this.prisma.comicIssue.update({
        where: { id },
        data: { collaborators: { createMany: { data: collaborators } } },
      });

      await this.prisma.$transaction([
        deleteCollaborators,
        updateCollaborators,
      ]);
    }

    if (areRoyaltyWalletsUpdated) {
      const deleteRoyaltyWallets = this.prisma.royaltyWallet.deleteMany({
        where: { comicIssueId: id },
      });

      const updateRoyaltyWallets = this.prisma.comicIssue.update({
        where: { id },
        data: { royaltyWallets: { createMany: { data: royaltyWallets } } },
      });

      await this.prisma.$transaction([
        deleteRoyaltyWallets,
        updateRoyaltyWallets,
      ]);
    }

    try {
      const updatedComicIssue = await this.prisma.comicIssue.update({
        include: {
          comic: { include: { creator: true, genres: true } },
          collectionNft: { select: { address: true } },
          collaborators: true,
          statelessCovers: true,
        },
        // where: { id, publishedAt: null },
        where: { id },
        data: {
          ...rest,
          sellerFeeBasisPoints: sellerFeeBasisPointsData,
          creatorBackupAddress,
        },
      });

      return updatedComicIssue;
    } catch {
      throw new NotFoundException(
        `Comic issue with id ${id} does not exist or is published`,
      );
    }
  }

  async updateFiles(id: number, comicIssueFilesDto: UpdateComicIssueFilesDto) {
    const { signature, pdf } = comicIssueFilesDto;

    const comicIssue = await this.prisma.comicIssue.findUnique({
      where: { id },
    });

    if (!comicIssue) {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    }

    const newFileKeys: string[] = [];
    const oldFileKeys = [comicIssue.signature, comicIssue.pdf];

    // upload files if any
    let signatureKey: string, pdfKey: string;
    try {
      const s3Folder = getS3Folder(comicIssue.comicSlug, comicIssue.slug);
      if (signature) {
        signatureKey = await this.s3.uploadFile(signature, {
          s3Folder,
          fileName: 'signature',
        });
        newFileKeys.push(signatureKey);
      }
      if (pdf) {
        pdfKey = await this.s3.uploadFile(pdf, {
          s3Folder,
          fileName: comicIssue.slug,
        });
        newFileKeys.push(pdfKey);
      }
    } catch {
      await this.s3.garbageCollectNewFiles(newFileKeys, oldFileKeys);
      throw new BadRequestException('Malformed file upload');
    }

    const updatedComicIssue = await this.prisma.comicIssue.update({
      where: { id: comicIssue.id },
      include: { pages: true, collaborators: true, statelessCovers: true },
      data: {
        signature: signatureKey,
        pdf: pdfKey,
      },
    });

    await this.s3.garbageCollectOldFiles(newFileKeys, oldFileKeys);
    return updatedComicIssue;
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
    const fileName = field === 'pdf' ? comicIssue.slug : field;
    const newFileKey = await this.s3.uploadFile(file, { s3Folder, fileName });

    try {
      comicIssue = await this.prisma.comicIssue.update({
        where: { id, publishedAt: null },
        include: { pages: true },
        data: { [field]: newFileKey },
      });
    } catch {
      await this.s3.garbageCollectNewFile(newFileKey, oldFileKey);
      throw new BadRequestException(
        'Malformed file upload or or comic issue already published',
      );
    }

    await this.s3.garbageCollectOldFile(newFileKey, oldFileKey);
    return comicIssue;
  }

  async publishOnChain(id: number, publishOnChainDto: PublishOnChainDto) {
    const comicIssue = await this.prisma.comicIssue.findUnique({
      where: { id, deletedAt: null },
      include: {
        collectionNft: true,
        statefulCovers: true,
        statelessCovers: true,
      },
    });

    if (!comicIssue) {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    } else if (!!comicIssue.publishedAt) {
      // throw new BadRequestException('Comic issue already published');
    } else if (!!comicIssue.collectionNft) {
      throw new BadRequestException('Comic issue already on chain');
    } else if (!!comicIssue.statelessCovers) {
      throw new BadRequestException('Comic issue missing stateless covers');
    } else if (!!comicIssue.statefulCovers) {
      throw new BadRequestException('Comic issue missing stateful covers');
    }

    validateWeb3PublishInfo(publishOnChainDto);
    validatePrice(publishOnChainDto);

    const {
      sellerFee,
      royaltyWallets,
      startDate,
      endDate,
      publicMintLimit,
      freezePeriod,
      ...updatePayload
    } = publishOnChainDto;
    const sellerFeeBasisPoints = isNil(sellerFee) ? undefined : sellerFee * 100;

    const deleteRoyaltyWallets = this.prisma.royaltyWallet.deleteMany({
      where: { comicIssueId: id },
    });

    let creatorBackupAddress: string;

    const updateComicIssue = this.prisma.comicIssue.update({
      where: { id },
      data: {
        publishedAt: new Date(),
        sellerFeeBasisPoints,
        royaltyWallets: { createMany: { data: royaltyWallets } },
        creatorBackupAddress,
        ...updatePayload,
      },
      include: {
        comic: { include: { creator: true } },
        statefulCovers: true,
        statelessCovers: true,
        collaborators: true,
        royaltyWallets: true,
      },
    });

    const [updatedComicIssue] = await this.prisma.$transaction([
      updateComicIssue,
      deleteRoyaltyWallets,
    ]);

    try {
      await this.candyMachineService.createComicIssueCM(
        updatedComicIssue,
        updatedComicIssue.comic.title,
        { startDate, endDate, publicMintLimit, freezePeriod },
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
  }

  async publishOffChain(id: number) {
    const comicIssue = await this.prisma.comicIssue.findUnique({
      where: { id, deletedAt: null },
    });

    if (!comicIssue) {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    } else if (!!comicIssue.publishedAt) {
      throw new BadRequestException('Comic already published');
    }

    return await this.prisma.comicIssue.update({
      where: { id },
      include: { collaborators: true },
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

  async read(id: number, userId: number) {
    return await this.userComicIssueService.read(userId, id);
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
          // human readable file name
          const fileName = getStatelessCoverName(cover);
          const imageKey = await this.s3.uploadFile(cover.image, {
            s3Folder,
            fileName,
          });

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
          const fileName = getStatefulCoverName(cover);
          const imageKey = await this.s3.uploadFile(cover.image, {
            s3Folder,
            fileName,
          });
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
    // Forbid this endpoint if the comic is published on chain?

    const comicIssue = await this.prisma.comicIssue.findUnique({
      where: { id: comicIssueId },
      include: { statelessCovers: true },
    });
    const oldStatelessCovers = comicIssue.statelessCovers;
    const areStatelessCoversUpdated = !!oldStatelessCovers;

    // upload stateless covers to S3 and format data for INSERT
    const newStatelessCoversData = await this.createManyStatelessCoversData(
      statelessCoversDto,
      comicIssue,
    );

    const oldFileKeys = oldStatelessCovers.map((cover) => cover.image);
    const newFileKeys = newStatelessCoversData.map((cover) => cover.image);

    try {
      if (areStatelessCoversUpdated) {
        const deleteStatelessCovers = this.prisma.statelessCover.deleteMany({
          where: { comicIssueId },
        });

        const createStatelessCovers = this.prisma.statelessCover.createMany({
          data: newStatelessCoversData,
        });

        await this.prisma.$transaction([
          deleteStatelessCovers,
          createStatelessCovers,
        ]);
      }
    } catch (e) {
      await this.s3.garbageCollectNewFiles(newFileKeys, oldFileKeys);
      throw e;
    }

    try {
      if (!areStatelessCoversUpdated) {
        await this.prisma.statelessCover.createMany({
          data: newStatelessCoversData,
        });
      }
    } catch (e) {
      await this.s3.garbageCollectNewFiles(newFileKeys);
      throw e;
    }

    await this.s3.garbageCollectOldFiles(newFileKeys, oldFileKeys);
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
