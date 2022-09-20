import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateComicPageDto } from './dto/create-comic-page.dto';
import { deleteS3Objects, putS3Object } from '../aws/s3client';
import { Prisma } from '@prisma/client';
import { isEmpty } from 'lodash';
import * as path from 'path';

export type ComicPageWhereInput = {
  comicIssue?: Prisma.ComicPageWhereInput['comicIssue'];
  id?: Prisma.ComicPageWhereInput['id'];
};

@Injectable()
export class ComicPageService {
  constructor(private prisma: PrismaService) {}

  // TODO: try catch uploads. What if one upload fails in Promise.all parallel?
  async createMany(
    createComicPagesDto: CreateComicPageDto[],
    comicIssueSlug: string = 'TODO:_temp-slug',
  ) {
    // TODO v2: Promise.allSettled
    const comicPagesData = await Promise.all(
      createComicPagesDto.map(async (createComicPageDto) => {
        const { comicIssueId, image, altImage, pageNumber, ...rest } =
          createComicPageDto;

        // Upload files if any
        let imageKey: string, altImageKey: string;
        try {
          imageKey = await this.uploadFile(comicIssueSlug, pageNumber, image);
          if (altImage)
            altImageKey = await this.uploadFile(
              comicIssueSlug,
              pageNumber,
              altImage,
            );
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

    // TODO: if it fails, undo file upload

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

  async uploadFile(
    comicIssueSlug: string,
    pageNumber: number,
    file: Express.Multer.File,
  ) {
    if (file) {
      const fileKey = `comic-issues/${comicIssueSlug}/pages/${
        file.fieldname
      }-${pageNumber}${path.extname(file.originalname)}`;

      await putS3Object({
        ContentType: file.mimetype,
        Key: fileKey,
        Body: file.buffer,
      });

      return fileKey;
    } else {
      throw new BadRequestException(`No valid ${file.fieldname} file provided`);
    }
  }
}
