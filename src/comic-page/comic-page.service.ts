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
  comicIssueId?: Prisma.ComicPageWhereInput['comicIssueId'];
  comicIssue?: Prisma.ComicPageWhereInput['comicIssue'];
  id?: Prisma.ComicPageWhereInput['id'];
};

@Injectable()
export class ComicPageService {
  constructor(
    private readonly s3: s3Service,
    private readonly prisma: PrismaService,
  ) {}

  async createMany(
    createComicPagesDto: CreateComicPageDto[],
    comicIssueId: number,
  ) {
    const comicPagesData = await Promise.all(
      createComicPagesDto.map(async (createComicPageDto) => {
        const { image, pageNumber, ...rest } = createComicPageDto;

        let imageKey: string;
        try {
          const s3Folder = await this.getS3Folder(pageNumber, comicIssueId);
          imageKey = await this.s3.uploadFile(s3Folder, image);
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

  async updateMany(pagesDto: CreateComicPageDto[], comicIssueId: number) {
    const comicIssue = await this.prisma.comicIssue.findUnique({
      where: { id: comicIssueId },
      include: { pages: true },
    });
    const oldComicPages = comicIssue.pages;

    // upload comic pages to S3 and format data for INSERT
    const newComicPages = await this.createMany(pagesDto, comicIssueId);

    try {
      await this.prisma.comicPage.createMany({
        data: newComicPages,
      });
    } catch (e) {
      const keys = newComicPages.map((page) => page.image);
      await this.s3.deleteObjects(keys);
      throw e;
    }

    if (!!oldComicPages.length) {
      const keys = oldComicPages.map((page) => page.image);
      await this.s3.deleteObjects(keys);
    }
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

  async getS3Folder(pageNumber: number, comicIssueId: number) {
    const comicPage = await this.prisma.comicPage.findUnique({
      where: { pageNumber_comicIssueId: { pageNumber, comicIssueId } },
      select: {
        pageNumber: true,
        comicIssue: { select: { slug: true, comicSlug: true } },
      },
    });

    if (!comicPage) {
      throw new NotFoundException(
        `Comic page with comic issue id ${comicIssueId} and page number ${pageNumber} does not exist`,
      );
    }

    return `comics/${comicPage.comicIssue.comicSlug}/issues/${comicPage.comicIssue.slug}/pages/`;
  }
}
