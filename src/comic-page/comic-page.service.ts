import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateComicPageDto } from './dto/create-comic-page.dto';
import {
  deleteS3Object,
  deleteS3Objects,
  listS3FolderKeys,
  putS3Object,
} from '../aws/s3client';
import { Prisma } from '@prisma/client';
import { isEmpty } from 'lodash';

export type ComicPageWhereInput = {
  comicId: Prisma.IntFilter | number;
  chapterNumber?: Prisma.IntFilter | number;
  id?: Prisma.IntFilter | number;
};

@Injectable()
export class ComicPageService {
  constructor(private prisma: PrismaService) {}

  // TODO v1.2: try catch uploads. What if one upload fails in Promise.all parallel?
  async createMany(createComicPagesDto: CreateComicPageDto[]) {
    // TODO v1.2: Promise.allSettled
    const comicPagesData = await Promise.all(
      createComicPagesDto.map(async (createComicPageDto) => {
        const { comicId, image, altImage, pageNumber, chapterNumber, ...rest } =
          createComicPageDto;

        // $transaction API?
        // try catch file uploads
        const imageKey = `${comicId}/chapter-${chapterNumber}/page-${pageNumber}.png`;
        await putS3Object({ Key: imageKey, Body: image.buffer });

        let altImageKey: string;
        if (altImage) {
          altImageKey = `${comicId}/chapter-${chapterNumber}/alt-page-${pageNumber}.png`;
          await putS3Object({ Key: altImageKey, Body: altImage.buffer });
        }

        const comicPageData: Prisma.ComicPageCreateManyInput = {
          ...rest,
          comicId,
          pageNumber,
          chapterNumber,
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
    await this.removeComicPages(where);
    const comicPagesData = await this.createMany(createComicPagesDto);

    const comicPages = await this.prisma.comicPage.createMany({
      data: comicPagesData,
    });

    return comicPages;
  }

  async removeComicPages(where: ComicPageWhereInput) {
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
        `Comic pages with comic id ${where.comicId || '--'} and chapter ${
          where.chapterNumber || '--'
        } do not exist`,
      );
    }
    return;
  }
}
