import {
  BadRequestException,
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
import { Prisma, ComicIssue, ComicPage, NFT } from '@prisma/client';

@Injectable()
export class ComicIssueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly comicPageService: ComicPageService,
  ) {}

  async create(
    createComicIssueDto: CreateComicIssueDto,
    createComicIssueFilesDto: CreateComicIssueFilesDto,
  ) {
    const { slug, comicId, pages, hashlist, ...rest } = createComicIssueDto;

    // Create ComicIssue without any files uploaded
    let comicIssue: ComicIssue & { pages: ComicPage[]; nfts: NFT[] };

    // Upload comic pages and format data for INSERT
    const pagesData = await this.comicPageService.createMany(pages);
    try {
      comicIssue = await this.prisma.comicIssue.create({
        include: { nfts: true, pages: true },
        data: {
          ...rest,
          slug,
          comic: { connect: { id: comicId } },
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
      const prefix = await this.getS3FilePrefix(slug);
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
        publishedAt: { not: null },
        verifiedAt: { not: null },
        comic: { deletedAt: null },
      },
    });
    return comicIssues;
  }

  async findOne(slug: string) {
    const comicIssue = await this.prisma.comicIssue.findUnique({
      include: { nfts: true },
      where: { slug },
    });

    if (!comicIssue) {
      throw new NotFoundException(`Comic issue ${slug} does not exist`);
    }

    return comicIssue;
  }

  async update(slug: string, updateComicIssueDto: UpdateComicIssueDto) {
    const { pages, ...rest } = updateComicIssueDto;

    // Delete old comic pages
    let pagesData: Prisma.ComicPageCreateManyComicIssueInput[];
    if (!isEmpty(pages)) {
      await this.comicPageService.deleteComicPages({ comicIssue: { slug } });

      // Upload new comic pages and format data for nested INSERT
      pagesData = await this.comicPageService.createMany(pages);
    }

    let updatedComicIssue: ComicIssue;
    try {
      updatedComicIssue = await this.prisma.comicIssue.update({
        where: { slug },
        include: { pages: true },
        data: {
          ...rest,
          // TODO!: check if pagesData = undefined will destroy all previous relations
          pages: { createMany: { data: pagesData } },
        },
      });
    } catch {
      throw new NotFoundException(`Comic issue ${slug} does not exist`);
    }

    return updatedComicIssue;
  }

  async updateFile(slug: string, file: Express.Multer.File) {
    const prefix = await this.getS3FilePrefix(slug);
    const fileKey = await uploadFile(prefix, file);
    try {
      const updatedComicIssue = await this.prisma.comicIssue.update({
        where: { slug },
        include: { pages: true },
        data: { [file.fieldname]: fileKey },
      });

      return updatedComicIssue;
    } catch {
      // Revert file upload
      await deleteS3Object({ Key: fileKey });
      throw new NotFoundException(`Comic issue ${slug} does not exist`);
    }
  }

  async publish(slug: string) {
    try {
      await this.prisma.comicIssue.update({
        where: { slug },
        data: { publishedAt: new Date() },
      });
    } catch {
      throw new NotFoundException(`Comic issue ${slug} does not exist`);
    }
  }

  async unpublish(slug: string) {
    try {
      await this.prisma.comicIssue.update({
        where: { slug },
        data: { publishedAt: null },
      });
    } catch {
      throw new NotFoundException(`Comic issue ${slug} does not exist`);
    }
  }

  async pseudoDelete(slug: string) {
    try {
      await this.prisma.comicIssue.update({
        where: { slug },
        data: { deletedAt: new Date() },
      });
    } catch {
      throw new NotFoundException(`Comic issue ${slug} does not exist`);
    }
  }

  async pseudoRecover(slug: string) {
    try {
      await this.prisma.comicIssue.update({
        where: { slug },
        data: { deletedAt: null },
      });
    } catch {
      throw new NotFoundException(`Comic issue ${slug} does not exist`);
    }
  }

  async remove(slug: string) {
    // Remove s3 assets
    const prefix = await this.getS3FilePrefix(slug);
    // TODO!: might actually have to strip off '/' from prefix
    const keys = await listS3FolderKeys({ Prefix: prefix });

    if (!isEmpty(keys)) {
      await deleteS3Objects({
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      });
    }

    try {
      await this.prisma.comicIssue.delete({ where: { slug } });
    } catch {
      throw new NotFoundException(`Comic issue ${slug} does not exist`);
    }
  }

  async getS3FilePrefix(slug: string) {
    const comicIssue = await this.prisma.comicIssue.findUnique({
      where: { slug },
      select: {
        slug: true,
        comic: { select: { slug: true, creator: { select: { slug: true } } } },
      },
    });

    const prefix = `creators/${comicIssue.comic.creator.slug}/comics/${comicIssue.comic.slug}/issues/${comicIssue.slug}/`;
    return prefix;
  }
}
