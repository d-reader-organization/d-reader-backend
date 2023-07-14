import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateComicPageDto } from './dto/create-comic-page.dto';
import { Language, Prisma } from '@prisma/client';
import { s3Service } from '../aws/s3.service';
import { TranslatedComicPage } from './entities/comic-page.dto';

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
        const { pageNumber, isPreviewable } = createComicPageDto;
        const comicPageData: Prisma.ComicPageCreateManyInput = {
          isPreviewable,
          comicIssueId,
          pageNumber,
        };
        return comicPageData;
      }),
    );
    await this.prisma.comicPage.createMany({
      data: comicPagesData,
    });
  }

  async createManyTranslations(
    createComicPagesDto: CreateComicPageDto[],
    comicIssueId: number,
    language: Language,
  ) {
    const comicPages = await this.prisma.comicPage.findMany({
      where: { comicIssueId },
    });
    const comicPageTranslationsData = await Promise.all(
      comicPages.map(async (comicPage, index) => {
        const { id, pageNumber } = comicPage;
        const { image } = createComicPagesDto[index];

        let imageKey: string;
        try {
          const s3Folder = await this.getS3Folder(pageNumber, comicIssueId);
          imageKey = await this.s3.uploadFile(s3Folder, image);
        } catch {
          throw new BadRequestException('Malformed file upload');
        }
        const comicPageTranslationData: Prisma.ComicPageTranslationCreateManyInput =
          {
            pageId: id,
            language,
            image: imageKey,
          };

        return comicPageTranslationData;
      }),
    );

    return comicPageTranslationsData;
  }

  async findAll(
    comicIssueId: number,
    language: Language,
    isPreviewable?: boolean,
  ): Promise<TranslatedComicPage[]> {
    return await this.prisma.comicPage.findMany({
      where: { comicIssueId, isPreviewable },
      include: {
        translations: {
          where: {
            OR: [
              {
                language: Language.En,
              },
              {
                language,
              },
            ],
          },
        },
      },
    });
  }

  async updateMany(
    pagesDto: CreateComicPageDto[],
    comicIssueId: number,
    language: Language,
  ) {
    const comicIssue = await this.prisma.comicIssue.findUnique({
      where: { id: comicIssueId },
      include: {
        pages: { include: { translations: { where: { language } } } },
      },
    });
    const oldComicTranslationPages = comicIssue.pages;
    await this.createMany(pagesDto, comicIssueId);

    // upload comic pages to S3 and format data for INSERT
    const newComicPageTranslations = await this.createManyTranslations(
      pagesDto,
      comicIssueId,
      language,
    );
    try {
      await this.prisma.comicPageTranslation.createMany({
        data: newComicPageTranslations,
      });
    } catch (e) {
      const keys = newComicPageTranslations.map((page) => page.image);
      await this.s3.deleteObjects(keys);
      throw e;
    }

    if (!!oldComicTranslationPages.length) {
      const keys = oldComicTranslationPages.map(
        (page) => page.translations[0]?.image,
      );
      await this.s3.deleteObjects(keys);
    }
  }

  async deleteComicPages(where: ComicPageWhereInput) {
    const pagesToDelete = await this.prisma.comicPage.findMany({
      where,
      include: { translations: true },
    });

    // Remove s3 assets
    const keys = pagesToDelete.flatMap((page) =>
      page.translations.map((translation) => translation.image),
    );
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
