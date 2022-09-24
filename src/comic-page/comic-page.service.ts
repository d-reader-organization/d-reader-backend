import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateComicPageDto } from './dto/create-comic-page.dto';
import { deleteS3Objects, uploadFile } from '../aws/s3client';
import { Prisma } from '@prisma/client';
import { isEmpty } from 'lodash';

export type ComicPageWhereInput = {
  comicIssue?: Prisma.ComicPageWhereInput['comicIssue'];
  id?: Prisma.ComicPageWhereInput['id'];
};

@Injectable()
export class ComicPageService {
  constructor(private prisma: PrismaService) {}

  async createMany(createComicPagesDto: CreateComicPageDto[] = []) {
    // TODO v2: Promise.allSettled
    const comicPagesData = await Promise.all(
      createComicPagesDto.map(async (createComicPageDto) => {
        const { comicIssueId, image, altImage, pageNumber, ...rest } =
          createComicPageDto;

        // Upload files if any
        let imageKey: string, altImageKey: string;
        try {
          const prefix = await this.getS3FilePrefix(pageNumber, comicIssueId);
          imageKey = await uploadFile(prefix, image);
          if (altImage) altImageKey = await uploadFile(prefix, altImage);
        } catch {
          throw new BadRequestException('Malformed file upload');
        }

        const comicPageData: Prisma.ComicPageCreateManyInput = {
          ...rest,
          comicIssueId,
          pageNumber,
          image: imageKey,
          altImage: altImageKey,
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
    const keys = pagesToDelete.reduce<string[]>((acc, page) => {
      if (page.altImage) return [...acc, page.image, page.altImage];
      else return [...acc, page.image];
    }, []);

    if (!isEmpty(keys)) {
      await deleteS3Objects({
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      });
    }

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

    const prefix = `creators/${comicPage.comicIssue.comic.creator.slug}/comics/${comicPage.comicIssue.comic.slug}/issues/${comicPage.comicIssue.slug}/pages/`;
    return prefix;
  }
}
