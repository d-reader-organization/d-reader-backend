import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import {
  UpdateCreatorDto,
  UpdateCreatorFilesDto,
} from '../creator/dto/update-creator.dto';
import {
  ActivityTargetType,
  CreatorActivityFeedType,
  CreatorChannel,
  Genre,
  Prisma,
} from '@prisma/client';
import { subDays } from 'date-fns';
import { CreatorFilterParams } from './dto/creator-params.dto';
import { UserCreatorService } from './user-creator.service';
import { s3Service } from '../aws/s3.service';
import { CreatorStats } from '../comic/dto/types';
import { getCreatorGenresQuery, getCreatorsQuery } from './creator.queries';
import { validateCreatorHandle } from '../utils/user';
import { MailService } from '../mail/mail.service';
import { insensitive } from '../utils/lodash';
import { DiscordService } from '../discord/discord.service';
import { CreatorFile } from '../discord/dto/types';
import {
  SearchCreator,
  CreatorFileProperty,
  CreatorStatusProperty,
} from './dto/types';
import { RawCreatorFilterParams } from './dto/raw-creator-params.dto';
import { SearchCreatorParams } from './dto/search-creator-params.dto';
import { CacheService } from '../cache/cache.service';
import { CachePath } from '../utils/cache';
import { ERROR_MESSAGES } from '../utils/errors';
import { CreatorActivityFeedParams } from './dto/creator-activity-feed-params.dto';
import { CreatorActivityFeedInput } from './dto/creator-activity-feed.dto';
import { SortOrder } from 'src/types/sort-order';
import { CreateCreatorChannelDto } from './dto/create-channel.dto';
import { appendTimestamp } from 'src/utils/helpers';
import { processCreatorIdString } from 'src/utils/creator';
import { SaleTransactionParams } from './dto/sale-transaction-params.dto';
import {
  SaleProductType,
  SaleSource,
  SaleTransactionInput,
} from './dto/sale-transaction-history.dto';

const getS3Folder = (slug: string) => `creators/${slug}/`;

@Injectable()
export class CreatorService {
  constructor(
    private readonly s3: s3Service,
    private readonly prisma: PrismaService,
    private readonly userCreatorService: UserCreatorService,
    private readonly mailService: MailService,
    private readonly discordService: DiscordService,
    private readonly cacheService: CacheService,
  ) {}

  async create(
    userId: number,
    createCreatorChannelDto: CreateCreatorChannelDto,
  ) {
    const { handle } = createCreatorChannelDto;
    validateCreatorHandle(handle);
    await this.throwIfHandleTaken(handle);

    const creator = await this.prisma.creatorChannel.create({
      data: {
        ...createCreatorChannelDto,
        handle,
        user: {
          connect: { id: userId },
        },
        s3BucketSlug: appendTimestamp(handle),
      },
    });

    this.discordService.creatorRegistered(creator);
    return creator;
  }

  async findAll({
    query,
    userId,
  }: {
    query: CreatorFilterParams;
    userId?: number;
  }) {
    const creators = await this.prisma.$queryRaw<
      Array<CreatorChannel & CreatorStats>
    >(getCreatorsQuery(query));
    const filteredCreators = [];

    for (const creator of creators) {
      const genresResult = await this.prisma.$queryRaw<[{ genres: Genre[] }]>(
        getCreatorGenresQuery(creator.id, query.genreSlugs),
      );
      if (!!genresResult.length) {
        const [totalVolume, myStats] = await Promise.all([
          this.userCreatorService.getTotalCreatorVolume(creator.id),
          this.userCreatorService.getUserStats(creator.id, userId),
        ]);
        filteredCreators.push({
          ...creator,
          stats: {
            // TODO comicIssuesCount and comicsCount are hotfix cause of mobile app
            // Will be fixed in next release on mobile
            comicIssuesCount: 0,
            comicsCount: 0,
            totalVolume,
            followersCount: Number(creator.followersCount),
          },
          myStats,
        });
      }
    }
    return filteredCreators;
  }

  async searchAll({
    search,
    skip,
    take,
    sortOrder,
  }: SearchCreatorParams): Promise<SearchCreator[]> {
    const creators = await this.prisma.creatorChannel.findMany({
      select: {
        avatar: true,
        id: true,
        handle: true,
      },
      where: {
        handle: { contains: search, mode: 'insensitive' },
      },
      orderBy: { handle: sortOrder },
      skip,
      take,
    });

    return await Promise.all(
      creators.map(async (creator) => {
        const issuesCount = await this.prisma.comicIssue.count({
          where: {
            publishedAt: { not: null },
            verifiedAt: { not: null },
            comic: {
              creatorId: creator.id,
            },
          },
        });
        return { ...creator, issuesCount };
      }),
    );
  }

  async findOne(id: string, userId?: number) {
    const creator = await this.prisma.creatorChannel.findUnique({
      where: processCreatorIdString(id),
    });

    if (!creator) {
      throw new NotFoundException(ERROR_MESSAGES.CREATOR_NOT_FOUND(id));
    }

    const getStats = this.userCreatorService.getCreatorStats(creator.id);
    const getMyStats = this.userCreatorService.getUserStats(creator.id, userId);

    const [stats, myStats] = await Promise.all([getStats, getMyStats]);

    if (!creator) {
      throw new NotFoundException(ERROR_MESSAGES.CREATOR_NOT_FOUND(id));
    }

    return { ...creator, stats, myStats };
  }

  async findAllRaw(query: RawCreatorFilterParams) {
    let where: Prisma.CreatorChannelWhereInput;
    if (query.search) {
      where = { handle: { contains: query.search, mode: 'insensitive' } };
    }
    return await this.prisma.creatorChannel.findMany({
      where,
      take: query.take,
      skip: query.skip,
    });
  }

  async findOneRaw(id: number) {
    const creator = this.prisma.creatorChannel.findUnique({ where: { id } });

    if (!creator) {
      throw new NotFoundException(ERROR_MESSAGES.CREATOR_NOT_FOUND(id));
    }

    return creator;
  }

  async findCreatorActivityFeed(
    query: CreatorActivityFeedParams,
  ): Promise<CreatorActivityFeedInput[]> {
    const activities = await this.prisma.creatorActivityFeed.findMany({
      where: { creatorId: query.creatorId, targetType: query.targetType },
      include: { user: true },
      skip: query.skip,
      take: query.take,
      orderBy: {
        createdAt: query.sortOrder || SortOrder.ASC,
      },
    });

    const feeds: CreatorActivityFeedInput[] = await Promise.all(
      activities.map(async (activity) => {
        return {
          ...activity,
          targetTitle: await this.findActivityTargetTitle(
            activity.targetId,
            activity.targetType,
          ),
        };
      }),
    );

    return feeds;
  }

  async findActivityTargetTitle(
    targetId: string,
    targetType: ActivityTargetType,
  ) {
    const SOMEONE = 'Someone';

    switch (targetType) {
      case ActivityTargetType.Comic: {
        const comic = await this.prisma.comic.findUnique({
          where: { slug: targetId },
        });
        return comic.title;
      }
      case ActivityTargetType.ComicIssue: {
        const comicIssue = await this.prisma.comicIssue.findUnique({
          where: { id: +targetId },
        });
        return comicIssue.title;
      }
      case ActivityTargetType.Creator: {
        const creator = await this.prisma.creatorChannel.findUnique({
          where: { id: +targetId },
        });
        return creator.handle;
      }
      default:
        return SOMEONE;
    }
  }

  // TODO: Add Secondary sales transactions
  async findSaleTransactions(
    query: SaleTransactionParams,
  ): Promise<SaleTransactionInput[]> {
    const { creatorId, take, skip } = query;

    const creatorFilter = creatorId
      ? { comicIssue: { comic: { creatorId } } }
      : undefined;
    const candyMachines = await this.prisma.candyMachine.findMany({
      where: { collection: creatorFilter },
      select: {
        address: true,
        coupons: {
          select: {
            id: true,
            currencySettings: {
              select: { label: true, splTokenAddress: true },
            },
          },
        },
      },
    });

    const filter = candyMachines.map((candyMachine) => candyMachine.address);
    const primarySaleReceipts = await this.prisma.candyMachineReceipt.findMany({
      where: { candyMachineAddress: { in: filter } },
      include: { user: true },
      take,
      skip,
    });

    const transactions: SaleTransactionInput[] = primarySaleReceipts.map(
      (receipt) => {
        const candyMachine = candyMachines.find(
          (candyMachine) => candyMachine.address == receipt.candyMachineAddress,
        );
        const coupon = candyMachine.coupons.find(
          (coupon) => coupon.id == receipt.couponId,
        );
        const currency = coupon.currencySettings.find(
          (setting) => setting.label == receipt.label,
        );

        return {
          transaction: receipt.transactionSignature,
          buyerAddress: receipt.buyerAddress,
          amount: Number(receipt.price),
          quantity: receipt.numberOfItems,
          splTokenAddress: currency.splTokenAddress,
          productType: SaleProductType.Comic,
          source: SaleSource.Sale,
          user: receipt.user || undefined,
          date: receipt.timestamp,
        };
      },
    );

    return transactions;
  }

  async update(id: number, updateCreatorDto: UpdateCreatorDto) {
    const { handle, ...otherData } = updateCreatorDto;
    const creator = await this.prisma.creatorChannel.findUnique({
      where: { id },
    });

    const isHandleUpdated = handle && creator.handle !== handle;

    if (isHandleUpdated) {
      validateCreatorHandle(handle);
      await this.throwIfHandleTaken(handle);

      await this.prisma.creatorChannel.update({
        where: { id },
        data: { handle },
      });
    }

    const updatedCreator = await this.prisma.creatorChannel.update({
      where: { id },
      data: otherData,
    });

    this.discordService.creatorProfileUpdated({
      oldCreator: creator,
      updatedCreator,
    });
    return updatedCreator;
  }

  //TODO: Should user and creator's have unique usernames ?
  async throwIfHandleTaken(handle: string) {
    const creator = await this.prisma.creatorChannel.findFirst({
      where: { handle: insensitive(handle) },
    });

    if (creator)
      throw new BadRequestException(ERROR_MESSAGES.NAME_ALREADY_TAKEN(handle));
  }

  async updateFiles(id: number, creatorFilesDto: UpdateCreatorFilesDto) {
    const { banner, avatar } = creatorFilesDto;

    let creator = await this.prisma.creatorChannel.findUnique({
      where: { id },
    });

    let avatarKey: string, bannerKey: string;

    const newFileKeys: string[] = [];
    const oldFileKeys: string[] = [];

    try {
      const s3Folder = getS3Folder(creator.s3BucketSlug);
      if (banner) {
        bannerKey = await this.s3.uploadFile(banner, {
          s3Folder,
          fileName: 'banner',
        });
        newFileKeys.push(bannerKey);
        oldFileKeys.push(creator.banner);
      }
      if (avatar) {
        avatarKey = await this.s3.uploadFile(avatar, {
          s3Folder,
          fileName: 'avatar',
        });
        newFileKeys.push(avatarKey);
        oldFileKeys.push(creator.avatar);
      }
      const creatorFiles: CreatorFile[] = [
        { type: 'banner', value: bannerKey },
        { type: 'avatar', value: avatarKey },
      ];
      this.discordService.creatorFilesUpdated(creator.handle, creatorFiles);
    } catch {
      await this.s3.garbageCollectNewFiles(newFileKeys, oldFileKeys);
      throw new BadRequestException(ERROR_MESSAGES.MALFORMED_FILE_UPLOAD);
    }

    creator = await this.prisma.creatorChannel.update({
      where: { id },
      data: { banner: bannerKey, avatar: avatarKey },
    });

    await this.s3.garbageCollectOldFiles(newFileKeys, oldFileKeys);
    return creator;
  }

  async updateFile(
    id: number,
    file: Express.Multer.File,
    field: CreatorFileProperty,
  ) {
    let creator: CreatorChannel;
    try {
      creator = await this.prisma.creatorChannel.findUnique({ where: { id } });
    } catch {
      throw new NotFoundException(ERROR_MESSAGES.CREATOR_NOT_FOUND(id));
    }

    const s3Folder = getS3Folder(creator.s3BucketSlug);
    const oldFileKey = creator[field];
    const newFileKey = await this.s3.uploadFile(file, {
      s3Folder,
      fileName: field,
    });

    try {
      creator = await this.prisma.creatorChannel.update({
        where: { id },
        data: { [file.fieldname]: newFileKey },
      });
    } catch {
      await this.s3.garbageCollectNewFile(newFileKey, oldFileKey);
      throw new BadRequestException('Malformed file upload');
    }

    const creatorFiles: CreatorFile[] = [{ type: field, value: newFileKey }];
    this.discordService.creatorFilesUpdated(creator.handle, creatorFiles);
    await this.s3.garbageCollectOldFile(newFileKey, oldFileKey);

    return creator;
  }

  async pseudoDelete(id: number) {
    // We should only allow account deletion if the creator has no published comics and comic issues?
    try {
      const creator = await this.prisma.creatorChannel.update({
        where: { id },
        data: { deletedAt: new Date() },
        include: { user: { select: { email: true } } },
      });

      const email = creator.user.email;
      this.mailService.creatorScheduledForDeletion(creator, email);
      return creator;
    } catch {
      throw new NotFoundException(`Creator ${id} does not exist`);
    }
  }

  async pseudoRecover(id: number) {
    try {
      return await this.prisma.creatorChannel.update({
        where: { id },
        data: { deletedAt: null },
      });
    } catch {
      throw new NotFoundException(`Creator ${id} does not exist`);
    }
  }

  indexCreatorStatusActivity(creatorId: number) {
    const targetId = creatorId.toString();

    this.prisma.creatorActivityFeed
      .create({
        data: {
          creator: { connect: { id: creatorId } },
          type: CreatorActivityFeedType.CreatorVerified,
          targetType: ActivityTargetType.Creator,
          targetId,
        },
      })
      .catch((e) =>
        ERROR_MESSAGES.FAILED_TO_INDEX_ACTIVITY(
          targetId,
          CreatorActivityFeedType.CreatorVerified,
          e,
        ),
      );
  }

  async toggleDate({
    id,
    property,
  }: {
    id: number;
    property: CreatorStatusProperty;
  }): Promise<string | void> {
    const creator = await this.prisma.creatorChannel.findFirst({
      where: { id },
      include: { user: { select: { email: true } } },
    });
    if (!creator) {
      throw new NotFoundException(`Creator ${id} does not exist`);
    }
    const updatedCreator = await this.prisma.creatorChannel.update({
      data: {
        [property]: !!creator[property] ? null : new Date(),
      },
      where: { id },
    });

    this.discordService.creatorStatusUpdated(updatedCreator, property);
    if (updatedCreator.verifiedAt) {
      const email = creator.user.email;
      await this.cacheService.deleteByPattern(CachePath.CREATOR_GET_MANY);
      this.mailService.creatorVerified(updatedCreator, email);
      this.indexCreatorStatusActivity(id);
    }
  }

  // @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  protected async clearCreatorsQueuedForRemoval() {
    const creatorsToRemove = await this.prisma.creatorChannel.findMany({
      where: { deletedAt: { lte: subDays(new Date(), 30) } },
      include: { user: { select: { email: true } } },
    });

    for (const creator of creatorsToRemove) {
      const email = creator.user.email;
      await this.mailService.creatorDeleted(creator, email);

      await this.prisma.creatorChannel.delete({ where: { id: creator.id } });

      const s3Folder = getS3Folder(creator.s3BucketSlug);
      await this.s3.deleteFolder(s3Folder);
    }
  }

  async dowloadAssets(id: number) {
    const creator = await this.prisma.creatorChannel.findUnique({
      where: { id },
    });

    const assets = this.s3.getAttachments([creator.banner, creator.avatar]);
    return assets;
  }
}
