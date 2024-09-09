import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateComicDto } from '../comic/dto/create-comic.dto';
import { UpdateComicDto, UpdateComicFilesDto } from './dto/update-comic.dto';
import { UserComicService } from './user-comic.service';
import { Comic, Genre, Creator } from '@prisma/client';
import { ComicParams } from './dto/comic-params.dto';
import { s3Service } from '../aws/s3.service';
import { PickFields } from '../types/shared';
import { ComicStats } from './types/comic-stats';
import { getComicsQuery } from './comic.queries';
import { insensitive } from '../utils/lodash';
import { RawComicParams } from './dto/raw-comic-params.dto';
import { getRawComicsQuery } from './raw-comic.queries';
import { Prisma } from '@prisma/client';
import { isEqual, isNil, sortBy } from 'lodash';
import { appendTimestamp } from '../utils/helpers';
import { DiscordNotificationService } from '../discord/notification.service';
import { generateMessageAfterAdminAction } from '../utils/discord';
import { MailService } from '../mail/mail.service';
import { BasicComicParams } from './dto/basic-comic-params.dto';

const getS3Folder = (slug: string) => `comics/${slug}/`;
type ComicFileProperty = PickFields<Comic, 'cover' | 'banner' | 'logo'>;

@Injectable()
export class ComicService {
  constructor(
    private readonly s3: s3Service,
    private readonly prisma: PrismaService,
    private readonly userComicService: UserComicService,
    private readonly discordService: DiscordNotificationService,
    private readonly mailService: MailService,
  ) {}

  async create(creatorId: number, createComicDto: CreateComicDto) {
    const { title, slug, genres, isCompleted, ...rest } = createComicDto;

    await Promise.all([
      this.throwIfTitleTaken(title),
      this.throwIfSlugTaken(slug),
    ]);

    try {
      const comic = await this.prisma.comic.create({
        data: {
          ...rest,
          s3BucketSlug: appendTimestamp(slug),
          title,
          slug,
          creatorId,
          completedAt: isCompleted ? new Date() : null,
          genres: { connect: genres.map((slug) => ({ slug })) },
        },
      });
      this.discordService.notifyComicCreated(comic);
      return comic;
    } catch (e) {
      console.error(e);
      throw new BadRequestException('Bad comic data');
    }
  }

  async findAll(query: ComicParams) {
    const comics = await this.prisma.$queryRaw<
      Array<Comic & { genres: Genre[]; creator: Creator } & ComicStats>
    >(getComicsQuery(query));
    return comics.map((comic) => {
      return {
        ...comic,
        stats: {
          favouritesCount: Number(comic.favouritesCount),
          ratersCount: Number(comic.ratersCount),
          averageRating: Number(comic.averageRating),
          issuesCount: Number(comic.issuesCount),
          readersCount: Number(comic.readersCount),
          viewersCount: Number(comic.viewersCount),
        },
      };
    });
  }

  async findAllRaw(query: RawComicParams) {
    const comics = await this.prisma.$queryRaw<
      Array<Comic & { genres: Genre[] } & ComicStats>
    >(getRawComicsQuery(query));

    const normalizedComics = comics.map((comic) => {
      return {
        ...comic,
        stats: {
          favouritesCount: Number(comic.favouritesCount),
          ratersCount: Number(comic.ratersCount),
          averageRating: Number(comic.averageRating),
          issuesCount: Number(comic.issuesCount),
          readersCount: Number(comic.readersCount),
          viewersCount: Number(comic.viewersCount),
        },
      };
    });

    return normalizedComics;
  }

  async findAllBasic(params: BasicComicParams) {
    const { creatorSlug, titleSubstring, sortOrder } = params;

    const comics = this.prisma.comic.findMany({
      include: { genres: true, creator: true },
      where: {
        creator: { slug: creatorSlug },
        title: { contains: titleSubstring },
      },
      orderBy: { title: sortOrder },
    });

    return comics;
  }

  async findOne(slug: string, userId?: number) {
    const findComic = this.prisma.comic.findUnique({
      include: { genres: true, creator: true },
      where: { slug },
    });
    const getStats = this.userComicService.getComicStats(slug);
    const getMyStats = this.userComicService.getUserStats(slug, userId);

    const [comic, stats, myStats] = await Promise.all([
      findComic,
      getStats,
      getMyStats,
    ]);

    if (!comic) {
      throw new NotFoundException(`Comic ${slug} does not exist`);
    }

    return { ...comic, stats, myStats };
  }

  async findOneRaw(slug: string) {
    const findComic = this.prisma.comic.findUnique({
      include: { genres: true },
      where: { slug },
    });
    const getStats = this.userComicService.getComicStats(slug);

    const [comic, stats] = await Promise.all([findComic, getStats]);

    if (!comic) {
      throw new NotFoundException(`Comic ${slug} does not exist`);
    }

    return { ...comic, stats };
  }

  async findAllByOwner(query: ComicParams, userId: number): Promise<Comic[]> {
    const ownedComics = await this.prisma.comic.findMany({
      distinct: 'title',
      orderBy: { title: 'asc' },
      where: {
        issues: {
          some: {
            collectibleComicCollection: {
              metadatas: {
                some: {
                  collectibleComics: {
                    some: { digitalAsset: { owner: { userId } } },
                  },
                },
              },
            },
          },
        },
      },
      skip: query.skip,
      take: query.take,
    });

    return await Promise.all(
      ownedComics.map(async (ownedComic) => {
        const issuesCount = await this.prisma.comicIssue.count({
          where: {
            comicSlug: ownedComic.slug,
            verifiedAt: { not: null },
            publishedAt: { not: null },
          },
        });
        return { ...ownedComic, stats: { issuesCount } };
      }),
    );
  }

  async findFavorites({
    query,
    userId,
  }: {
    query: ComicParams;
    userId: number;
  }): Promise<Comic[]> {
    const comics = (
      await this.prisma.userComic.findMany({
        where: {
          userId,
          bookmarkedAt: {
            not: null,
          },
        },
        include: { comic: true },
        skip: query.skip,
        take: query.take,
      })
    ).map((userComic) => userComic.comic);

    return await Promise.all(
      comics.map(async (comic) => {
        const issuesCount = await this.prisma.comicIssue.count({
          where: {
            comicSlug: comic.slug,
            verifiedAt: { not: null },
            publishedAt: { not: null },
          },
        });
        return { ...comic, stats: { issuesCount } };
      }),
    );
  }

  async update(slug: string, updateComicDto: UpdateComicDto) {
    const { genres, isCompleted, slug: newSlug, ...rest } = updateComicDto;
    if (newSlug && slug !== newSlug) {
      await this.throwIfSlugTaken(newSlug);
    }

    const comic = await this.prisma.comic.findUnique({
      where: { slug },
      include: { genres: true },
    });

    const sortedCurrentGenres = sortBy(comic.genres.map((g) => g.slug));
    const sortedNewGenres = sortBy(genres);
    const areGenresEqual = isEqual(sortedCurrentGenres, sortedNewGenres);
    const isCompletedDifferent = isCompleted !== !!comic.completedAt;

    const areGenresUpdated = !isNil(genres) && !areGenresEqual;
    const isCompletedUpdated = !isNil(isCompleted) && isCompletedDifferent;

    let genresData: Prisma.ComicUpdateInput['genres'];
    if (areGenresUpdated) {
      genresData = { set: genres.map((slug) => ({ slug })) };
    }

    let isCompletedData: Prisma.ComicUpdateInput['completedAt'];
    if (isCompletedUpdated) {
      isCompletedData = isCompleted ? new Date() : null;
    }

    try {
      const updatedComic = await this.prisma.comic.update({
        where: { slug },
        data: {
          ...rest,
          ...(newSlug && { slug: newSlug }),
          completedAt: isCompletedData,
          genres: genresData,
        },
      });
      this.discordService.notifyComicUpdated({ updatedComic, oldComic: comic });
      return updatedComic;
    } catch {
      throw new NotFoundException(`Comic ${slug} does not exist`);
    }
  }

  async updateFiles(slug: string, comicFilesDto: UpdateComicFilesDto) {
    const { cover, banner, logo } = comicFilesDto;

    let comic = await this.prisma.comic.findUnique({ where: { slug } });

    if (!comic) {
      throw new NotFoundException(`Comic ${slug} does not exist`);
    }

    const newFileKeys: string[] = [];
    const oldFileKeys: string[] = [];

    let coverKey: string, bannerKey: string, logoKey: string;
    try {
      const s3Folder = getS3Folder(comic.s3BucketSlug);
      if (cover) {
        coverKey = await this.s3.uploadFile(cover, {
          s3Folder,
          fileName: 'cover',
        });
        newFileKeys.push(coverKey);
        oldFileKeys.push(comic.cover);
      }
      if (banner) {
        bannerKey = await this.s3.uploadFile(banner, {
          s3Folder,
          fileName: 'banner',
        });
        newFileKeys.push(bannerKey);
        oldFileKeys.push(comic.banner);
      }
      if (logo) {
        logoKey = await this.s3.uploadFile(logo, {
          s3Folder,
          fileName: 'logo',
        });
        newFileKeys.push(logoKey);
        oldFileKeys.push(comic.logo);
      }
    } catch {
      await this.s3.garbageCollectNewFiles(newFileKeys, oldFileKeys);
      throw new BadRequestException('Malformed file upload');
    }

    comic = await this.prisma.comic.update({
      where: { slug },
      data: {
        cover: coverKey,
        banner: bannerKey,
        logo: logoKey,
      },
    });

    await this.s3.garbageCollectOldFiles(newFileKeys, oldFileKeys);
    return comic;
  }

  async updateFile(
    slug: string,
    file: Express.Multer.File,
    field: ComicFileProperty,
  ) {
    let comic: Comic;
    try {
      comic = await this.prisma.comic.findUnique({ where: { slug } });
    } catch {
      throw new NotFoundException(`Comic ${slug} does not exist`);
    }

    const s3Folder = getS3Folder(comic.s3BucketSlug);
    const oldFileKey = comic[field];
    const newFileKey = await this.s3.uploadFile(file, {
      s3Folder,
      fileName: field,
    });

    try {
      comic = await this.prisma.comic.update({
        where: { slug },
        data: { [field]: newFileKey },
      });
    } catch {
      await this.s3.garbageCollectNewFile(newFileKey, oldFileKey);
      throw new BadRequestException('Malformed file upload');
    }

    await this.s3.garbageCollectOldFile(newFileKey, oldFileKey);
    return comic;
  }

  async throwIfTitleTaken(title: string) {
    const comic = await this.prisma.comic.findFirst({
      where: { title: insensitive(title) },
    });

    if (comic) throw new BadRequestException(`${title} already taken`);
  }

  async throwIfSlugTaken(slug: string) {
    const comic = await this.prisma.comic.findFirst({
      where: { slug: insensitive(slug) },
    });

    if (comic) throw new BadRequestException(`${slug} already taken`);
  }

  async publish(slug: string) {
    try {
      return await this.prisma.comic.update({
        where: { slug },
        // where: { slug, publishedAt: null },
        data: { publishedAt: new Date() },
      });
    } catch {
      throw new NotFoundException(
        `Comic ${slug} does not exist or is already published`,
      );
    }
  }

  async unpublish(slug: string) {
    try {
      return await this.prisma.comic.update({
        where: { slug },
        data: { publishedAt: null },
      });
    } catch {
      throw new NotFoundException(`Comic ${slug} does not exist`);
    }
  }

  async toggleDatePropUpdate({
    slug,
    propertyName,
    withMessage,
  }: {
    slug: string;
    propertyName: keyof Pick<Comic, 'publishedAt' | 'verifiedAt'>;
    withMessage?: boolean;
  }): Promise<string | void> {
    const comic = await this.prisma.comic.findUnique({ where: { slug } });

    if (!comic) {
      throw new NotFoundException(`Comic ${slug} does not exist`);
    }

    const updatedComic = await this.prisma.comic.update({
      data: {
        [propertyName]: !!comic[propertyName] ? null : new Date(),
      },
      where: { slug },
      include: { creator: true },
    });

    if (propertyName === 'verifiedAt' && updatedComic.verifiedAt) {
      this.mailService.comicSeriesVerifed(updatedComic);
    } else if (propertyName === 'publishedAt' && updatedComic.publishedAt) {
      this.mailService.comicSeriesPublished(updatedComic);
    }

    if (withMessage) {
      return generateMessageAfterAdminAction({
        isPropertySet: !!updatedComic[propertyName],
        propertyName,
        startOfTheMessage: `Comic ${updatedComic.title} has been`,
      });
    }
  }

  async delete(slug: string) {
    const comic = await this.prisma.comic.findUnique({ where: { slug } });

    if (!comic) {
      throw new NotFoundException(`Comic ${slug} does not exist`);
    } else if (!!comic.publishedAt) {
      throw new ForbiddenException(`Published comic cannot be deleted`);
    }

    await this.prisma.comic.delete({ where: { slug } });

    const s3Folder = getS3Folder(comic.s3BucketSlug);
    await this.s3.deleteFolder(s3Folder);
  }

  async dowloadAssets(slug: string) {
    const comic = await this.prisma.comic.findUnique({
      where: { slug },
      include: { issues: true },
    });

    const assets = await this.s3.getAttachments([
      comic.banner,
      comic.logo,
      comic.cover,
    ]);
    return assets;
  }
}
