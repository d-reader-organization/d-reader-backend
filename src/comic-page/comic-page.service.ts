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
import { ComicPage } from '@prisma/client';

export type ComicPageWhereInput = {
  comicIssue?: Prisma.ComicPageWhereInput['comicIssue'];
  id?: Prisma.ComicPageWhereInput['id'];
};

@Injectable()
export class ComicPageService {
  constructor(private prisma: PrismaService) {}

  async createMany(createComicPagesDto: CreateComicPageDto[] = []) {
    const comicPagesData = await Promise.all(
      createComicPagesDto.map(async (createComicPageDto) => {
        const { comicIssueId, image, pageNumber, ...rest } = createComicPageDto;

        // Upload files if any
        let imageKey: string;
        try {
          const prefix = await this.getS3FilePrefix(pageNumber, comicIssueId);
          imageKey = await uploadFile(prefix, image);
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

  async getComicPagesForIssue(
    comicIssueId: number,
    walletAddress: string,
  ): Promise<ComicPage[]> {
    let showOnlyPreviews: boolean | undefined;

    // find all NFTs that token gate the comic issue and are owned by the wallet
    const ownedComicIssues = await this.prisma.comicIssueNft.findMany({
      where: { collectionNft: { comicIssueId }, owner: walletAddress },
    });

    // if wallet does not own the issue, see if it's whitelisted per comic issue basis
    if (ownedComicIssues.length === 0) {
      const walletComicIssue = await this.prisma.walletComicIssue.findFirst({
        where: { walletAddress, comicIssueId, isWhitelisted: true },
      });

      // if wallet does not own the issue, see if it's whitelisted per comic basis
      if (!walletComicIssue) {
        const walletComic = await this.prisma.walletComic.findFirst({
          where: {
            walletAddress,
            comic: { issues: { some: { id: comicIssueId } } },
            isWhitelisted: true,
          },
        });

        // if wallet is still not allowed to view the full content of the issue
        // make sure to show only preview pages of the comic
        if (!walletComic) showOnlyPreviews = true;
      }
    }

    return await this.prisma.comicPage.findMany({
      where: {
        comicIssueId,
        isPreviewable: showOnlyPreviews,
      },
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

    if (!comicPage) {
      throw new NotFoundException(
        `Comic page with comic issue id ${comicIssueId} and page number ${pageNumber} does not exist`,
      );
    }

    const prefix = `creators/${comicPage.comicIssue.comic.creator.slug}/comics/${comicPage.comicIssue.comic.slug}/issues/${comicPage.comicIssue.slug}/pages/`;
    return prefix;
  }
}
