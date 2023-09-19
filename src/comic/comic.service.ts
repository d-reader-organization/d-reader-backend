import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateComicDto } from '../comic/dto/create-comic.dto';
import { UpdateComicDto, UpdateComicFilesDto } from './dto/update-comic.dto';
import { UserComicService } from './user-comic.service';
import { Comic, Genre, Creator } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ComicParams } from './dto/comic-params.dto';
import { s3Service } from '../aws/s3.service';
import { PickFields } from '../types/shared';
import { ComicStats } from './types/comic-stats';
import { getComicsQuery } from './comic.queries';
import { ComicInput } from './dto/comic.dto';
import { insensitive } from '../utils/lodash';
import { Prisma } from '@prisma/client';
import { subDays } from 'date-fns';
import { isNil } from 'lodash';

const getS3Folder = (slug: string) => `comics/${slug}/`;
type ComicFileProperty = PickFields<Comic, 'cover' | 'banner' | 'pfp' | 'logo'>;

@Injectable()
export class ComicService {
  constructor(
    private readonly s3: s3Service,
    private readonly prisma: PrismaService,
    private readonly userComicService: UserComicService,
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
          title,
          slug,
          creatorId,
          completedAt: isCompleted ? new Date() : null,
          genres: { connect: genres.map((slug) => ({ slug })) },
        },
      });

      return comic;
    } catch (e) {
      throw new BadRequestException('Bad comic data', e);
    }
  }

  async findAll(query: ComicParams) {
    const comics = await this.prisma.$queryRaw<
      Array<
        Comic & {
          genres?: Genre[];
          creator?: Creator;
        } & ComicStats
      >
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

  async findAllByOwner(
    query: ComicParams,
    userId: number,
  ): Promise<ComicInput[]> {
    const ownedComics = await this.prisma.comic.findMany({
      distinct: 'title',
      orderBy: { title: 'asc' },
      where: {
        issues: {
          some: {
            collectionNft: {
              collectionItems: { some: { owner: { userId } } },
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
            deletedAt: null,
            verifiedAt: { not: null },
            publishedAt: { not: null },
          },
        });
        return { ...ownedComic, stats: { issuesCount } };
      }),
    );
  }

  async update(slug: string, updateComicDto: UpdateComicDto) {
    const { genres, isCompleted, ...rest } = updateComicDto;

    // const comic = await this.prisma.comic.findUnique({ where: { slug } });
    // const isTitleUpdated = title && comic.title !== title;
    // const isSlugUpdated = slug && comic.slug !== slug;
    const areGenresUpdated = !isNil(genres);
    const isCompletedUpdated = !isNil(isCompleted);

    // if (isTitleUpdated) {
    //   await this.throwIfTitleTaken(title);
    //   await this.prisma.comic.update({ where: { slug }, data: { title } });
    // }

    // if (isSlugUpdated) {
    //   await this.throwIfSlugTaken(title);
    //   await this.prisma.comic.update({ where: { slug }, data: { title } });
    //   // migrate files from deprecated s3 folder to a new one
    // }

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
        where: { slug, publishedAt: null },
        data: {
          ...rest,
          completedAt: isCompletedData,
          genres: genresData,
        },
      });

      return updatedComic;
    } catch {
      throw new NotFoundException(
        `Comic ${slug} does not exist or is published`,
      );
    }
  }

  async updateFiles(slug: string, comicFilesDto: UpdateComicFilesDto) {
    const { cover, banner, pfp, logo } = comicFilesDto;

    const comic = await this.prisma.comic.findUnique({ where: { slug } });

    if (!comic) {
      throw new NotFoundException(`Comic ${slug} does not exist`);
    }

    let coverKey: string, bannerKey: string, pfpKey: string, logoKey: string;
    try {
      const s3Folder = getS3Folder(slug);
      if (cover) coverKey = await this.s3.uploadFile(s3Folder, cover, 'cover');
      if (banner)
        bannerKey = await this.s3.uploadFile(s3Folder, banner, 'banner');
      if (pfp) pfpKey = await this.s3.uploadFile(s3Folder, pfp, 'pfp');
      if (logo) logoKey = await this.s3.uploadFile(s3Folder, logo, 'logo');
    } catch {
      throw new BadRequestException('Malformed file upload');
    }

    return await this.prisma.comic.update({
      where: { slug },
      data: {
        cover: coverKey,
        banner: bannerKey,
        pfp: pfpKey,
        logo: logoKey,
      },
    });
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

    const s3Folder = getS3Folder(slug);
    const oldFileKey = comic[field];
    const newFileKey = await this.s3.uploadFile(s3Folder, file, field);

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
        where: { slug, publishedAt: null },
        data: { publishedAt: new Date() },
      });
    } catch {
      throw new NotFoundException(
        `Comic ${slug} does not exist or is published`,
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

  async pseudoDelete(slug: string) {
    try {
      return await this.prisma.comic.update({
        where: { slug, publishedAt: null },
        data: { deletedAt: new Date() },
      });
    } catch {
      throw new NotFoundException(
        `Comic ${slug} does not exist or is published`,
      );
    }
  }

  async pseudoRecover(slug: string) {
    try {
      return await this.prisma.comic.update({
        where: { slug },
        data: { deletedAt: null },
      });
    } catch {
      throw new NotFoundException(`Comic ${slug} does not exist`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async clearComicsQueuedForRemoval() {
    const where = { where: { deletedAt: { lte: subDays(new Date(), 30) } } };
    const comicsToRemove = await this.prisma.comic.findMany(where);
    await this.prisma.comic.deleteMany(where);

    for (const comic of comicsToRemove) {
      const s3Folder = getS3Folder(comic.slug);
      await this.s3.deleteFolder(s3Folder);
    }
  }
}
