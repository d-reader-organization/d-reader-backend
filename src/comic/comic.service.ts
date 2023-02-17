import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import {
  CreateComicDto,
  CreateComicFilesDto,
} from 'src/comic/dto/create-comic.dto';
import { UpdateComicDto } from 'src/comic/dto/update-comic.dto';
import {
  deleteS3Object,
  deleteS3Objects,
  listS3FolderKeys,
  uploadFile,
} from '../aws/s3client';
import { WalletComicService } from './wallet-comic.service';
import { Comic, Creator, Genre, Prisma } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { subDays } from 'date-fns';
import { isEmpty } from 'lodash';
import { WithComicStats } from './types/comic-stats';
import { ComicFilterParams } from './dto/comic-filter-params.dto';
import { FiltersTag } from 'src/types/filters';

@Injectable()
export class ComicService {
  constructor(
    private prisma: PrismaService,
    private walletComicService: WalletComicService,
  ) {}

  async create(
    creatorId: number,
    createComicDto: CreateComicDto,
    createComicFilesDto: CreateComicFilesDto,
  ) {
    const { slug, genres, isOngoing, ...rest } = createComicDto;

    // Create Comic without any files uploaded
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
      console.log(e);
      throw new BadRequestException('Bad comic data');
    }

    const { cover, pfp, logo } = createComicFilesDto;

    // Upload files if any
    let coverKey: string, pfpKey: string, logoKey: string;
    try {
      const prefix = await this.getS3FilePrefix(slug);
      if (cover) coverKey = await uploadFile(prefix, cover);
      if (pfp) pfpKey = await uploadFile(prefix, pfp);
      if (logo) logoKey = await uploadFile(prefix, logo);
    } catch {
      await this.prisma.comic.delete({ where: { slug: comic.slug } });
      throw new BadRequestException('Malformed file upload');
    }

    // Update Comic with s3 file keys
    comic = await this.prisma.comic.update({
      where: { slug: comic.slug },
      data: {
        cover: coverKey,
        pfp: pfpKey,
        logo: logoKey,
      },
    });

    return comic;
  }

  async findAll(
    query: ComicFilterParams,
    walletAddress?: string,
  ): Promise<WithComicStats<Comic & { genres: Genre[]; creator: Creator }>[]> {
    const comics = await this.specialFindMany(this.findManyArgs(query));

    const aggregatedComics = await Promise.all(
      comics.map(async (comic) => {
        const { stats, myStats } = await this.walletComicService.aggregateAll(
          comic.slug,
          walletAddress,
        );

        return { ...comic, stats, myStats } as WithComicStats<
          Comic & { genres: Genre[]; creator: Creator }
        >;
      }),
    );

    return aggregatedComics;
  }

  async findOne(
    slug: string,
    walletAddress?: string,
  ): Promise<WithComicStats<Comic & { genres: Genre[]; creator: Creator }>> {
    const comic = await this.prisma.comic.findFirst({
      include: { genres: true, creator: true },
      where: { slug },
    });

    if (!comic) {
      throw new NotFoundException(`Comic ${slug} does not exist`);
    }
    await this.walletComicService.refreshDate(walletAddress, slug, 'viewedAt');
    const { stats, myStats } = await this.walletComicService.aggregateAll(
      slug,
      walletAddress,
    );

    return { ...comic, stats, myStats };
  }

  async update(slug: string, updateComicDto: UpdateComicDto) {
    const { genres, ...rest } = updateComicDto;

    try {
      const updatedComic = await this.prisma.comic.update({
        where: { slug },
        data: {
          ...rest,
          genres: { set: genres.map((slug) => ({ slug })) },
        },
      });

      return updatedComic;
    } catch {
      throw new NotFoundException(`Comic ${slug} does not exist`);
    }
  }

  async updateFile(slug: string, file: Express.Multer.File) {
    let comic: Comic;
    try {
      comic = await this.prisma.comic.findUnique({ where: { slug } });
    } catch {
      throw new NotFoundException(`Comic ${slug} does not exist`);
    }

    const oldFileKey = comic[file.fieldname];
    const prefix = await this.getS3FilePrefix(slug);
    const newFileKey = await uploadFile(prefix, file);

    try {
      comic = await this.prisma.comic.update({
        where: { slug },
        data: { [file.fieldname]: newFileKey },
      });
    } catch {
      await deleteS3Object({ Key: newFileKey });
      throw new BadRequestException('Malformed file upload');
    }

    // If all went well with the new file upload and it didn't
    // override the old one, make sure to garbage collect it
    if (oldFileKey !== newFileKey) {
      await deleteS3Object({ Key: oldFileKey });
    }

    return comic;
  }

  async publish(slug: string) {
    try {
      return await this.prisma.comic.update({
        where: { slug },
        data: { publishedAt: new Date() },
      });
    } catch {
      throw new NotFoundException(`Comic ${slug} does not exist`);
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
        where: { slug },
        data: { deletedAt: new Date() },
      });
    } catch {
      throw new NotFoundException(`Comic ${slug} does not exist`);
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

  async remove(slug: string) {
    // Remove s3 assets
    const prefix = await this.getS3FilePrefix(slug);
    const keys = await listS3FolderKeys({ Prefix: prefix });

    if (!isEmpty(keys)) {
      await deleteS3Objects({
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      });
    }

    try {
      await this.prisma.comic.delete({ where: { slug } });
    } catch {
      throw new NotFoundException(`Comic ${slug} does not exist`);
    }
    return;
  }

  async getS3FilePrefix(slug: string) {
    const comic = await this.prisma.comic.findUnique({
      where: { slug },
      select: {
        slug: true,
        creator: { select: { slug: true } },
      },
    });

    if (!comic) {
      throw new NotFoundException(`Comic ${slug} does not exist`);
    }

    const prefix = `creators/${comic.creator.slug}/comics/${comic.slug}/`;
    return prefix;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async clearComicsQueuedForRemoval() {
    const comicsToRemove = await this.prisma.comic.findMany({
      where: { deletedAt: { lte: subDays(new Date(), 30) } }, // 30 days ago
    });

    for (const comic of comicsToRemove) {
      await this.remove(comic.slug);
      console.log(`Removed comic ${comic.slug} at ${new Date()}`);
    }
  }

  async specialFindMany<T extends Prisma.ComicFindManyArgs>(
    args?: Prisma.SelectSubset<T, Prisma.ComicFindManyArgs>,
  ) {
    return await this.prisma.comic.findMany<
      Prisma.SelectSubset<T, Prisma.ComicFindManyArgs>
    >(args);
  }

  private findManyArgs(query: ComicFilterParams) {
    return {
      include: {
        genres: true,
        creator: true,
        issues: {
          where: {},
        },
      },
      skip: query.skip,
      take: query.take,
      ...this.restArgs(query),
    };
  }

  private restArgs(query: ComicFilterParams): Record<string, any> {
    const defaultFilter = {
      name: { contains: query?.nameSubstring, mode: 'insensitive' },
      creator: { slug: query?.creatorSlug },
      deletedAt: null,
      publishedAt: { lt: new Date() },
      verifiedAt: { not: null },
    };
    switch (query.tag) {
      case FiltersTag.Free:
        return {
          where: { ...defaultFilter, publishedAt: { not: null } },
        };
      case FiltersTag.Latest:
        return { where: defaultFilter };
      case FiltersTag.Likes:
        return { where: defaultFilter };
      case FiltersTag.New:
        return { where: defaultFilter };
      case FiltersTag.Performance:
        return { where: defaultFilter };
      case FiltersTag.Popular:
        return {
          where: {
            ...defaultFilter,
            publishedAt: { not: null },
            popularizedAt: { not: null },
          },
          orderBy: {
            popularizedAt: 'desc',
          },
        };
      case FiltersTag.Rating:
        return { where: defaultFilter };
      case FiltersTag.Readers:
        return { where: defaultFilter };
      case FiltersTag.Viewers:
        return { where: defaultFilter };
      default:
        return { where: defaultFilter };
    }
  }
}
