import {
  BadRequestException,
  ForbiddenException,
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
import { ComicIssueParams } from './dto/comic-issue-params.dto';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { UserComicIssueService } from './user-comic-issue.service';
import { PublishOnChainDto } from './dto/publish-on-chain.dto';
import { s3Service } from '../aws/s3.service';
import { PickFields } from '../types/shared';
import { PUBLIC_GROUP_LABEL, getRarityShare, minSupply } from '../constants';
import { CreateStatelessCoverDto } from './dto/covers/create-stateless-cover.dto';
import { CreateStatefulCoverDto } from './dto/covers/create-stateful-cover.dto';
import { getComicIssuesQuery } from './comic-issue.queries';
import { ComicIssueStats } from '../comic/types/comic-issue-stats';
import { ComicIssueInput } from './dto/comic-issue.dto';
import {
  getStatefulCoverName,
  getStatelessCoverName,
  validateWeb3PublishInfo,
} from '../utils/comic-issue';
import { OwnedComicIssueInput } from './dto/owned-comic-issue.dto';
import { Metaplex, WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import { metaplex } from '../utils/metaplex';
import { RawComicIssueParams } from './dto/raw-comic-issue-params.dto';
import { RawComicIssueInput } from './dto/raw-comic-issue.dto';
import { RawComicIssueStats } from '../comic/types/raw-comic-issue-stats';
import { getRawComicIssuesQuery } from './raw-comic-issue.queries';
import { GuardParams } from '../candy-machine/dto/types';
import { appendTimestamp } from '../utils/helpers';

const getS3Folder = (comicSlug: string, comicIssueSlug: string) =>
  `comics/${comicSlug}/issues/${comicIssueSlug}/`;
type ComicIssueFileProperty = PickFields<ComicIssue, 'pdf'>;

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
      title,
      slug,
      number,
      comicSlug,
      creatorBackupAddress = this.metaplex.identity().publicKey.toBase58(),
      collaborators = [],
      royaltyWallets = [],
      ...rest
    } = createComicIssueDto;

    await Promise.all([
      this.throwIfComicSlugAndNumberTaken(comicSlug, number),
      this.throwIfSlugAndComicSlugTaken(slug, comicSlug),
      this.throwIfTitleAndComicSlugTaken(title, comicSlug),
    ]);

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
          s3BucketSlug: appendTimestamp(slug),
          slug,
          title,
          number,
          creatorBackupAddress,
          comic: { connect: { slug: comicSlug } },
          collaborators: { createMany: { data: collaborators } },
          royaltyWallets: { createMany: { data: royaltyWallets } },
        },
      });

      return comicIssue;
    } catch (e) {
      console.error(e);
      throw new BadRequestException('Bad comic issue data');
    }
  }

  async findActiveCandyMachine(
    comicIssueId: number,
  ): Promise<string | undefined> {
    const candyMachine = await this.prisma.candyMachine.findFirst({
      where: {
        collection: { comicIssueId },
        itemsRemaining: { gt: 0 },
        groups: {
          some: { OR: [{ endDate: { gt: new Date() } }, { endDate: null }] },
        },
      },
    });
    return candyMachine?.address;
  }

  async findAll(query: ComicIssueParams): Promise<ComicIssueInput[]> {
    const comicIssues = await this.prisma.$queryRaw<
      Array<
        ComicIssue & {
          comic: Comic;
          statelesscovers: StatelessCover[];
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
          statelessCovers: issue.statelesscovers,
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
          statelesscovers: StatelessCover[];
        } & RawComicIssueStats
      >
    >(getRawComicIssuesQuery(query));

    const normalizedComicIssues = comicIssues.map((issue) => {
      return {
        ...issue,
        statelessCovers: issue.statelesscovers,
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

  async findOnePublic(where: Prisma.ComicIssueWhereInput) {
    const comicIssue = await this.prisma.comicIssue.findFirst({
      where,
      include: {
        comic: { include: { creator: true, genres: true } },
        collaborators: true,
        statelessCovers: true,
      },
    });

    if (!comicIssue) {
      throw new NotFoundException(`Comic issue does not exist`);
    }

    const totalPagesCount = await this.prisma.comicPage.count({
      where: { comicIssueId: comicIssue.id },
    });

    const id = comicIssue.id;
    const activeCandyMachineAddress = await this.findActiveCandyMachine(id);

    return {
      ...comicIssue,
      activeCandyMachineAddress,
      stats: {
        favouritesCount: 0,
        ratersCount: 0,
        averageRating: 0,
        readersCount: 0,
        viewersCount: 0,
        totalIssuesCount: 0,
        totalPagesCount,
      },
    };
  }

  async findOne({
    where,
    userId,
  }: {
    where: Prisma.ComicIssueWhereInput;
    userId: number;
  }) {
    const comicIssue = await this.prisma.comicIssue.findFirst({
      where,
      include: {
        comic: { include: { creator: true, genres: true } },
        collaborators: true,
        statelessCovers: true,
      },
    });

    const id = comicIssue.id;
    const findActiveCandyMachine = this.findActiveCandyMachine(id);
    const getStats = this.userComicIssueService.getComicIssueStats(id);
    const getMyStats = this.userComicIssueService.getUserStats(id, userId);
    const checkCanUserRead = this.userComicIssueService.checkCanUserRead(
      id,
      userId,
    );

    const [activeCandyMachineAddress, stats, myStats, canRead] =
      await Promise.all([
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
      activeCandyMachineAddress,
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
      include: { collection: true, statelessCovers: true },
      where: {
        comicSlug: query.comicSlug,
        collection: {
          metadatas: {
            some: { asset: { some: { owner: { userId } } } },
          },
        },
      },
      skip: query.skip,
      take: query.take,
    });

    return await Promise.all(
      ownedComicIssues.map(async (comicIssue) => {
        const collectionAddress = comicIssue.collection.address;
        const ownedCopiesCount = await this.prisma.digitalAsset.count({
          where: { metadata: { collectionAddress }, owner: { userId } },
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
      number,
      collaborators,
      royaltyWallets,
      creatorBackupAddress = this.metaplex.identity().publicKey.toBase58(),
      ...rest
    } = updateComicIssueDto;

    const comicIssue = await this.prisma.comicIssue.findUnique({
      where: { id },
    });

    if (!comicIssue) {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    } else if (!!comicIssue.publishedAt) {
      throw new ForbiddenException(`Published comic issue cannot be updated`);
    }

    const isNumberUpdated = !isNil(number) && comicIssue.number !== number;
    const areCollaboratorsUpdated = !isNil(collaborators); // && collaborators are different from current collaborators
    const areRoyaltyWalletsUpdated = !isNil(royaltyWallets); // && wallets are different from current wallets

    if (isNumberUpdated) {
      await this.throwIfComicSlugAndNumberTaken(comicIssue.comicSlug, number);
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
          collection: { select: { address: true } },
          collaborators: true,
          statelessCovers: true,
        },
        where: { id },
        // where: { id, publishedAt: null },
        data: { number, ...rest, creatorBackupAddress },
      });

      return updatedComicIssue;
    } catch {
      throw new NotFoundException(
        `Comic issue with id ${id} does not exist or is published`,
      );
    }
  }

  async updateFiles(id: number, comicIssueFilesDto: UpdateComicIssueFilesDto) {
    const { pdf } = comicIssueFilesDto;

    const comicIssue = await this.prisma.comicIssue.findUnique({
      where: { id },
      include: {
        comic: {
          select: {
            s3BucketSlug: true,
          },
        },
      },
    });

    if (!comicIssue) {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    }

    const newFileKeys: string[] = [];
    const oldFileKeys: string[] = [];

    // upload files if any
    let pdfKey: string;
    try {
      const s3Folder = getS3Folder(
        comicIssue.comic.s3BucketSlug,
        comicIssue.s3BucketSlug,
      );

      if (pdf) {
        pdfKey = await this.s3.uploadFile(pdf, {
          s3Folder,
          fileName: comicIssue.slug,
        });
        newFileKeys.push(pdfKey);
        oldFileKeys.push(comicIssue.pdf);
      }
    } catch {
      await this.s3.garbageCollectNewFiles(newFileKeys, oldFileKeys);
      throw new BadRequestException('Malformed file upload');
    }

    const updatedComicIssue = await this.prisma.comicIssue.update({
      where: { id: comicIssue.id },
      include: { pages: true, collaborators: true, statelessCovers: true },
      data: {
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
    let comicIssue: ComicIssue & {
      pages: ComicPage[];
      comic: Comic;
    };
    try {
      comicIssue = await this.prisma.comicIssue.findUnique({
        where: { id },
        include: {
          pages: true,
          comic: true,
        },
      });
    } catch {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    }

    const s3Folder = getS3Folder(
      comicIssue.comic.s3BucketSlug,
      comicIssue.s3BucketSlug,
    );
    const oldFileKey = comicIssue[field];
    const fileName = field === 'pdf' ? comicIssue.slug : field;
    const newFileKey = await this.s3.uploadFile(file, { s3Folder, fileName });

    try {
      const updatedComicIssue = await this.prisma.comicIssue.update({
        where: { id, publishedAt: null },
        include: { pages: true, collaborators: true, statelessCovers: true },
        data: { [field]: newFileKey },
      });

      await this.s3.garbageCollectOldFile(newFileKey, oldFileKey);
      return updatedComicIssue;
    } catch {
      await this.s3.garbageCollectNewFile(newFileKey, oldFileKey);
      throw new BadRequestException(
        'Malformed file upload or or comic issue already published',
      );
    }
  }

  async throwIfComicSlugAndNumberTaken(comicSlug: string, number: number) {
    const comicIssue = await this.prisma.comicIssue.findFirst({
      where: { comicSlug, number },
    });

    if (comicIssue) {
      throw new BadRequestException(
        `Comic already has episode number ${number}`,
      );
    }
  }

  async throwIfSlugAndComicSlugTaken(slug: string, comicSlug: string) {
    const comicIssue = await this.prisma.comicIssue.findFirst({
      where: { slug, comicSlug },
    });

    if (comicIssue) {
      throw new BadRequestException(
        `Comic already has issue with slug ${slug}`,
      );
    }
  }

  async throwIfTitleAndComicSlugTaken(title: string, comicSlug: string) {
    const comicIssue = await this.prisma.comicIssue.findFirst({
      where: { title, comicSlug },
    });

    if (comicIssue) {
      throw new BadRequestException(
        `Comic already has issue with title ${title}`,
      );
    }
  }

  async publishOnChain(id: number, publishOnChainDto: PublishOnChainDto) {
    const comicIssue = await this.prisma.comicIssue.findUnique({
      where: { id },
      include: {
        collection: true,
        statefulCovers: true,
        statelessCovers: true,
      },
    });

    if (!comicIssue) {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    }
    // else if (!!comicIssue.publishedAt) {
    // throw new BadRequestException('Comic issue already published');
    // }
    else if (!comicIssue.statelessCovers) {
      throw new BadRequestException('Comic issue missing stateless covers');
    } else if (!comicIssue.statefulCovers) {
      throw new BadRequestException('Comic issue missing stateful covers');
    } else if (
      minSupply(comicIssue.statelessCovers.length) > publishOnChainDto.supply
    ) {
      throw new BadRequestException(
        `Comic issue with ${
          comicIssue.statelessCovers.length
        } rarities must have atleast ${minSupply(
          comicIssue.statelessCovers.length,
        )} supply`,
      );
    }
    validateWeb3PublishInfo(publishOnChainDto);

    const {
      onChainName,
      royaltyWallets,
      startDate,
      endDate,
      publicMintLimit,
      freezePeriod,
      supply,
      mintPrice,
      tokenStandard,
      whiteListType,
      ...updatePayload
    } = publishOnChainDto;

    const deleteRoyaltyWallets = this.prisma.royaltyWallet.deleteMany({
      where: { comicIssueId: id },
    });

    let creatorBackupAddress: string;

    const updateComicIssue = this.prisma.comicIssue.update({
      where: { id },
      data: {
        publishedAt: new Date(),
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

    const [, updatedComicIssue] = await this.prisma.$transaction([
      deleteRoyaltyWallets,
      updateComicIssue,
    ]);

    const guardParams: GuardParams = {
      startDate,
      endDate,
      mintLimit: publicMintLimit,
      freezePeriod,
      splTokenAddress: WRAPPED_SOL_MINT.toBase58(),
      mintPrice,
      label: PUBLIC_GROUP_LABEL,
      displayLabel: PUBLIC_GROUP_LABEL,
      supply,
      whiteListType,
    };
    try {
      await this.candyMachineService.createComicIssueCM({
        comicIssue: updatedComicIssue,
        comicName: updatedComicIssue.comic.title,
        onChainName,
        guardParams,
        tokenStandard,
      });
    } catch (e) {
      // revert in case of failure, handle it gracefully:
      // revert comic issue back to the initial state,
      // destroy collection NFT and CM inserted items etc.
      throw e;
    }
  }

  async publishOffChain(id: number) {
    const comicIssue = await this.prisma.comicIssue.findUnique({
      where: { id },
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

  async delete(id: number) {
    const comicIssue = await this.prisma.comicIssue.findUnique({
      where: { id },
      include: {
        comic: {
          select: {
            s3BucketSlug: true,
          },
        },
      },
    });

    if (!comicIssue) {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    } else if (!!comicIssue.publishedAt) {
      throw new ForbiddenException(`Published comic issue cannot be deleted`);
    }

    await this.prisma.comicIssue.delete({ where: { id } });

    const s3Folder = getS3Folder(
      comicIssue.comic.s3BucketSlug,
      comicIssue.s3BucketSlug,
    );
    await this.s3.deleteFolder(s3Folder);
  }

  /** upload many stateless cover images to S3 and format data for INSERT */
  async createManyStatelessCoversData(
    covers: CreateStatelessCoverDto[],
    comicIssue: ComicIssue & { comic: { s3BucketSlug: string } },
  ) {
    const s3Folder = getS3Folder(
      comicIssue.comic.s3BucketSlug,
      comicIssue.s3BucketSlug,
    );
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
            artistTwitterHandle: cover.artistTwitterHandle,
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
    comicIssue: ComicIssue & { comic: { s3BucketSlug: string } },
  ) {
    const s3Folder = getS3Folder(
      comicIssue.comic.s3BucketSlug,
      comicIssue.s3BucketSlug,
    );
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
      include: {
        statelessCovers: true,
        comic: { select: { s3BucketSlug: true } },
      },
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
      } else {
        await this.prisma.statelessCover.createMany({
          data: newStatelessCoversData,
        });
      }
    } catch (e) {
      await this.s3.deleteObjects(newFileKeys);
      throw e;
    }

    await this.s3.deleteObjects(oldFileKeys);
  }

  async updateStatefulCovers(
    statefulCoversDto: CreateStatefulCoverDto[],
    comicIssueId: number,
  ) {
    const comicIssue = await this.prisma.comicIssue.findUnique({
      where: { id: comicIssueId },
      include: {
        statefulCovers: true,
        comic: { select: { s3BucketSlug: true } },
      },
    });
    const oldStatefulCovers = comicIssue.statefulCovers;
    const areStatefulCoversUpdated = !!oldStatefulCovers;

    // upload stateful covers to S3 and format data for INSERT
    const newStatefulCoversData = await this.createManyStatefulCoversData(
      statefulCoversDto,
      comicIssue,
    );

    const oldFileKeys = oldStatefulCovers.map((cover) => cover.image);
    const newFileKeys = newStatefulCoversData.map((cover) => cover.image);

    try {
      if (areStatefulCoversUpdated) {
        const deleteStatefulCovers = this.prisma.statefulCover.deleteMany({
          where: { comicIssueId },
        });

        const createStatefulCovers = this.prisma.statefulCover.createMany({
          data: newStatefulCoversData,
        });

        await this.prisma.$transaction([
          deleteStatefulCovers,
          createStatefulCovers,
        ]);
      } else {
        await this.prisma.statefulCover.createMany({
          data: newStatefulCoversData,
        });
      }
    } catch (e) {
      await this.s3.deleteObjects(newFileKeys);
      throw e;
    }

    await this.s3.deleteObjects(oldFileKeys);
  }

  async dowloadAssets(id: number) {
    const comicIssue = await this.prisma.comicIssue.findUnique({
      where: { id },
      include: { statefulCovers: true, statelessCovers: true, pages: true },
    });

    const statelessCoverKeys = comicIssue.statelessCovers.map(
      (cover) => cover.image,
    );
    const statefulCoverKeys = comicIssue.statefulCovers.map(
      (cover) => cover.image,
    );
    const comicPageKeys = comicIssue.pages.map((page) => page.image);

    const assets = await this.s3.getAttachments([
      comicIssue.pdf,
      ...statelessCoverKeys,
      ...statefulCoverKeys,
      ...comicPageKeys,
    ]);
    return assets;
  }
}
