import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateComicPageDto } from './dto/create-comic-page.dto';
import { Prisma } from '@prisma/client';
import { ComicPage } from '@prisma/client';
import { s3Service } from '../aws/s3.service';

const getS3Folder = (comicSlug: string, comicIssueSlug: string) => {
  return `comics/${comicSlug}/issues/${comicIssueSlug}/pages/`;
};

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
    s3Folder: string,
  ) {
    const comicPagesData = await Promise.all(
      createComicPagesDto.map(async (createComicPageDto) => {
        const { image, pageNumber, ...rest } = createComicPageDto;
        const fileName = `page-${pageNumber}`;

        let imageKey: string;
        try {
          imageKey = await this.s3.uploadFile(image, { s3Folder, fileName });
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
    const areComicPagesUpdated = !!oldComicPages;

    const s3Folder = getS3Folder(comicIssue.slug, comicIssue.slug);

    // upload comic pages to S3 and format data for INSERT
    const newComicPagesData = await this.createMany(
      pagesDto,
      comicIssueId,
      s3Folder,
    );

    const oldFileKeys = oldComicPages.map((cover) => cover.image);
    const newFileKeys = newComicPagesData.map((cover) => cover.image);

    try {
      if (areComicPagesUpdated) {
        const deleteComicPages = this.prisma.comicPage.deleteMany({
          where: { comicIssueId },
        });

        const createComicPages = this.prisma.comicPage.createMany({
          data: newComicPagesData,
        });

        await this.prisma.$transaction([deleteComicPages, createComicPages]);
      } else {
        await this.prisma.comicPage.createMany({
          data: newComicPagesData,
        });
      }
    } catch (e) {
      await this.s3.deleteObjects(newFileKeys);
      throw e;
    }

    await this.s3.deleteObjects(oldFileKeys);
  }
}
