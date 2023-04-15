import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateComicPageDto } from './dto/create-comic-page.dto';
import { Prisma } from '@prisma/client';
import { ComicPage } from '@prisma/client';
import { s3Service } from '../aws/s3.service';

export type ComicPageWhereInput = {
  comicIssue?: Prisma.ComicPageWhereInput['comicIssue'];
  id?: Prisma.ComicPageWhereInput['id'];
};

@Injectable()
export class ComicPageService {
  constructor(
    private readonly s3: s3Service,
    private readonly prisma: PrismaService,
  ) {}

  async createMany(createComicPagesDto: CreateComicPageDto[] = []) {
    const comicPagesData = await Promise.all(
      createComicPagesDto.map(async (createComicPageDto) => {
        const { comicIssueId, image, pageNumber, ...rest } = createComicPageDto;

        // Upload files if any
        let imageKey: string;
        try {
          const prefix = await this.getS3FilePrefix(pageNumber, comicIssueId);
          imageKey = await this.s3.uploadFile(prefix, image);
        } catch {
          throw new BadRequestException('Malformed file upload');
        }

        const comicPageData: Prisma.ComicPageCreateManyInput = {
          ...rest,
          comicIssueId,
          pageNumber,
          image: imageKey,
        };

        return comicPageData;
      }),
    );

    // const comicPages = await this.prisma.comicPage.createMany({
    //   data: comicPagesData,
    // });

    // return comicPages;

    return comicPagesData;
  }

  async findAll(
    comicIssueId: number,
    isPreviewable?: boolean,
  ): Promise<ComicPage[]> {
    return await this.prisma.comicPage.findMany({
      where: { comicIssueId, isPreviewable },
    });
  }

  // update
  async replace(
    where: ComicPageWhereInput,
    createComicPagesDto: CreateComicPageDto[],
  ) {
    await this.deleteComicPages(where);
    const comicPagesData = await this.createMany(createComicPagesDto);

    const comicPages = await this.prisma.comicPage.createMany({
      data: comicPagesData,
    });

    return comicPages;
  }

  async deleteComicPages(where: ComicPageWhereInput) {
    const pagesToDelete = await this.prisma.comicPage.findMany({ where });

    // Remove s3 assets
    const keys = pagesToDelete.map((page) => page.image);
    await this.s3.deleteObjects(keys);

    try {
      await this.prisma.comicPage.deleteMany({ where });
    } catch {
      throw new NotFoundException(
        `Comic pages with comic issue ${
          where.comicIssue.slug || '--'
        } and/or id ${where.id || '--'} do not exist`,
      );
    }
    return;
  }

  async getS3FilePrefix(pageNumber: number, comicIssueId: number) {
    const comicPage = await this.prisma.comicPage.findUnique({
      where: {
        pageNumber_comicIssueId: {
          pageNumber,
          comicIssueId,
        },
      },
      select: {
        pageNumber: true,
        comicIssue: {
          select: {
            slug: true,
            comic: {
              select: { slug: true, creator: { select: { slug: true } } },
            },
          },
        },
      },
    });

    if (!comicPage) {
      throw new NotFoundException(
        `Comic page with comic issue id ${comicIssueId} and page number ${pageNumber} does not exist`,
      );
    }

    const prefix = `creators/${comicPage.comicIssue.comic.creator.slug}/comics/${comicPage.comicIssue.comic.slug}/issues/${comicPage.comicIssue.slug}/pages/`;
    return prefix;
  }
}
