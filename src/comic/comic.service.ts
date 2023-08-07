import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import {
  CreateComicDto,
  CreateComicFilesDto,
} from '../comic/dto/create-comic.dto';
import { UpdateComicDto } from '../comic/dto/update-comic.dto';
import { UserComicService } from './user-comic.service';
import { Comic, Genre, Creator } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { subDays } from 'date-fns';
import { ComicParams } from './dto/comic-params.dto';
import { s3Service } from '../aws/s3.service';
import { PickFields } from '../types/shared';
import { ComicStats } from './types/comic-stats';
import { getComicsQuery } from './comic.queries';
import { ComicInput } from './dto/comic.dto';

const getS3Folder = (slug: string) => `comics/${slug}/`;
type ComicFileProperty = PickFields<Comic, 'cover' | 'banner' | 'pfp' | 'logo'>;

@Injectable()
export class ComicService {
  constructor(
    private readonly s3: s3Service,
    private readonly prisma: PrismaService,
    private readonly userComicService: UserComicService,
  ) {}

  async create(
    creatorId: number,
    createComicDto: CreateComicDto,
    createComicFilesDto: CreateComicFilesDto,
  ) {
    const { slug, genres, isOngoing, ...rest } = createComicDto;

    let comic: Comic;
    try {
      comic = await this.prisma.comic.create({
        data: {
          ...rest,
          slug,
          creatorId,
          completedAt: !isOngoing ? new Date() : null,
          genres: { connect: genres.map((slug) => ({ slug })) },
        },
      });
    } catch (e) {
      throw new BadRequestException('Bad comic data', e);
    }

    const { cover, banner, pfp, logo } = createComicFilesDto;

    let coverKey: string, bannerKey: string, pfpKey: string, logoKey: string;
    try {
      const s3Folder = getS3Folder(slug);
      if (cover) coverKey = await this.s3.uploadFile(s3Folder, cover, 'cover');
      if (banner)
        bannerKey = await this.s3.uploadFile(s3Folder, banner, 'banner');
      if (pfp) pfpKey = await this.s3.uploadFile(s3Folder, pfp, 'pfp');
      if (logo) logoKey = await this.s3.uploadFile(s3Folder, logo, 'logo');
    } catch {
      await this.prisma.comic.delete({ where: { slug: comic.slug } });
      throw new BadRequestException('Malformed file upload');
    }

    comic = await this.prisma.comic.update({
      where: { slug: comic.slug },
      data: {
        cover: coverKey,
        banner: bannerKey,
        pfp: pfpKey,
        logo: logoKey,
      },
    });

    return comic;
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
    ownerAddress: string,
  ): Promise<ComicInput[]> {
    const ownedComics = await this.prisma.comic.findMany({
      distinct: 'title',
      orderBy: { title: 'asc' },
      where: {
        issues: {
          some: {
            collectionNft: {
              collectionItems: { some: { ownerAddress } },
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
          where: { comicSlug: ownedComic.slug },
        });
        return { ...ownedComic, stats: { issuesCount } };
      }),
    );
  }

  async update(slug: string, updateComicDto: UpdateComicDto) {
    const { genres, ...rest } = updateComicDto;

    try {
      const updatedComic = await this.prisma.comic.update({
        where: { slug, publishedAt: null },
        data: {
          ...rest,
          genres: { set: genres.map((slug) => ({ slug })) },
        },
      });

      return updatedComic;
    } catch {
      throw new NotFoundException(
        `Comic ${slug} does not exist or is published`,
      );
    }
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
    const newFileKey = await this.s3.uploadFile(s3Folder, file);

    try {
      comic = await this.prisma.comic.update({
        where: { slug },
        data: { [field]: newFileKey },
      });
    } catch {
      await this.s3.deleteObject(newFileKey);
      throw new BadRequestException('Malformed file upload');
    }

    await this.s3.garbageCollectOldFile(newFileKey, oldFileKey);
    return comic;
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
