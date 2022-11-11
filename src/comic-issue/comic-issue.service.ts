import {
  BadRequestException,
  ImATeapotException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import {
  CreateComicIssueDto,
  CreateComicIssueFilesDto,
} from './dto/create-comic-issue.dto';
import { UpdateComicIssueDto } from './dto/update-comic-issue.dto';
import {
  deleteS3Object,
  deleteS3Objects,
  listS3FolderKeys,
  uploadFile,
} from '../aws/s3client';
import { isEmpty } from 'lodash';
import { ComicPageService } from 'src/comic-page/comic-page.service';
import { Prisma, ComicIssue, ComicPage, ComicIssueNft } from '@prisma/client';
import { MetaplexService } from 'src/vendors/metaplex.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { subDays } from 'date-fns';

@Injectable()
export class ComicIssueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly comicPageService: ComicPageService,
    private readonly metaplexService: MetaplexService,
  ) {}

  async create(
    creatorId: number,
    createComicIssueDto: CreateComicIssueDto,
    createComicIssueFilesDto: CreateComicIssueFilesDto,
  ) {
    const { slug, comicSlug, pages, hashlist, ...rest } = createComicIssueDto;

    const parentComic = await this.prisma.comic.findUnique({
      where: { slug: comicSlug },
    });

    if (!parentComic) {
      throw new NotFoundException(`Comic ${comicSlug} does not exist`);
    }

    // Make sure creator of the comic issue owns the parent comic as well
    if (parentComic.creatorId !== creatorId) throw new ImATeapotException();

    // Create ComicIssue without any files uploaded
    let comicIssue: ComicIssue & { pages: ComicPage[]; nfts: ComicIssueNft[] };

    // Upload comic pages and format data for INSERT
    const pagesData = await this.comicPageService.createMany(pages);
    try {
      comicIssue = await this.prisma.comicIssue.create({
        include: { nfts: true, pages: true },
        data: {
          ...rest,
          slug,
          comic: { connect: { slug: comicSlug } },
          pages: { createMany: { data: pagesData } },
          nfts: {
            createMany: {
              data: hashlist.map((hash) => ({ mint: hash })),
            },
          },
        },
      });
    } catch {
      throw new BadRequestException('Bad comic issue data');
    }

    const { cover, soundtrack } = createComicIssueFilesDto;

    // Upload files if any
    let coverKey: string, soundtrackKey: string;
    try {
      const prefix = await this.getS3FilePrefix(comicIssue.id);
      if (cover) coverKey = await uploadFile(prefix, cover);
      if (soundtrack) soundtrackKey = await uploadFile(prefix, soundtrack);
    } catch {
      throw new BadRequestException('Malformed file upload');
    }

    // Update Comic Issue with s3 file keys
    comicIssue = await this.prisma.comicIssue.update({
      where: { id: comicIssue.id },
      include: { nfts: true, pages: true },
      data: {
        cover: coverKey,
        soundtrack: soundtrackKey,
      },
    });

    return comicIssue;
  }

  async findAll() {
    const comicIssues = await this.prisma.comicIssue.findMany({
      where: {
        deletedAt: null,
        publishedAt: { lt: new Date() },
        verifiedAt: { not: null },
        comic: { deletedAt: null },
      },
    });
    return comicIssues;
  }

  async findOne(id: number) {
    const comicIssue = await this.prisma.comicIssue.findUnique({
      include: { nfts: true, pages: true },
      where: { id },
    });

    if (!comicIssue) {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    }

    return comicIssue;
  }

  async findOneProtected(walletAddress: string, id: number) {
    let showOnlyPreviews: boolean | undefined;

    // Find all NFTs that are token gating this Comic
    const whitelistedNfts = await this.prisma.comicIssueNft.findMany({
      where: { comicIssueId: id },
    });

    if (whitelistedNfts.length !== 0) {
      const isHolder = await this.metaplexService.verifyNFTHolder(
        walletAddress,
        whitelistedNfts.map((nft) => nft.mint),
      );
      showOnlyPreviews = isHolder ? undefined : true;
    }

    // TODO v1.2: check isWhitelisted from WalletComic

    const comicIssue = await this.prisma.comicIssue.findUnique({
      where: { id },
      include: {
        nfts: true,
        pages: { where: { isPreviewable: showOnlyPreviews } },
      },
    });

    if (!comicIssue) {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    }

    return comicIssue;
  }

  async update(id: number, updateComicIssueDto: UpdateComicIssueDto) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { pages, hashlist, ...rest } = updateComicIssueDto;

    // Delete old comic pages
    let pagesData: Prisma.ComicPageCreateManyComicIssueInput[];
    if (!isEmpty(pages)) {
      await this.comicPageService.deleteComicPages({ comicIssue: { id } });

      // Upload new comic pages and format data for nested INSERT
      pagesData = await this.comicPageService.createMany(pages);
    }

    let updatedComicIssue: ComicIssue;
    try {
      updatedComicIssue = await this.prisma.comicIssue.update({
        where: { id },
        include: { pages: true },
        data: {
          ...rest,
          // TODO v1.2: check if pagesData = undefined will destroy all previous relations
          pages: { createMany: { data: pagesData } },
          // TODO v1.2: unable to edit 'nfts'
          // nfts: { set: hashlist.map((hash) => ({ mint: hash })) },
        },
      });
    } catch {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    }

    return updatedComicIssue;
  }

  async updateFile(id: number, file: Express.Multer.File) {
    let comicIssue: ComicIssue;
    try {
      comicIssue = await this.prisma.comicIssue.findUnique({
        where: { id },
        include: { pages: true },
      });
    } catch {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    }

    const oldFileKey = comicIssue[file.fieldname];
    const prefix = await this.getS3FilePrefix(id);
    const newFileKey = await uploadFile(prefix, file);

    try {
      comicIssue = await this.prisma.comicIssue.update({
        where: { id },
        include: { pages: true },
        data: { [file.fieldname]: newFileKey },
      });
    } catch {
      await deleteS3Object({ Key: newFileKey });
      throw new BadRequestException('Malformed file upload');
    }

    if (oldFileKey !== newFileKey) {
      await deleteS3Object({ Key: oldFileKey });
    }

    return comicIssue;
  }

  async publish(id: number) {
    try {
      await this.prisma.comicIssue.update({
        where: { id },
        data: { publishedAt: new Date() },
      });
    } catch {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    }
  }

  async unpublish(id: number) {
    try {
      await this.prisma.comicIssue.update({
        where: { id },
        data: { publishedAt: null },
      });
    } catch {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    }
  }

  async pseudoDelete(id: number) {
    try {
      await this.prisma.comicIssue.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } catch {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    }
  }

  async pseudoRecover(id: number) {
    try {
      await this.prisma.comicIssue.update({
        where: { id },
        data: { deletedAt: null },
      });
    } catch {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    }
  }

  async remove(id: number) {
    // Remove s3 assets
    const prefix = await this.getS3FilePrefix(id);
    const keys = await listS3FolderKeys({ Prefix: prefix });

    if (!isEmpty(keys)) {
      await deleteS3Objects({
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      });
    }

    try {
      await this.prisma.comicIssue.delete({ where: { id } });
    } catch {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    }
  }

  async getS3FilePrefix(id: number) {
    const comicIssue = await this.prisma.comicIssue.findUnique({
      where: { id },
      select: {
        slug: true,
        comic: { select: { slug: true, creator: { select: { slug: true } } } },
      },
    });

    if (!comicIssue) {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    }

    const prefix = `creators/${comicIssue.comic.creator.slug}/comics/${comicIssue.comic.slug}/issues/${comicIssue.slug}/`;
    return prefix;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async clearComicIssuesQueuedForRemoval() {
    const comicIssuesToRemove = await this.prisma.comicIssue.findMany({
      where: { deletedAt: { lte: subDays(new Date(), 30) } }, // 30 days ago
    });

    for (const comicIssue of comicIssuesToRemove) {
      await this.remove(comicIssue.id);
      console.log(`Removed comic issue ${comicIssue.id} at ${new Date()}`);
    }
  }
}
