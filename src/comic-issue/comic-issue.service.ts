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
  putS3Object,
} from '../aws/s3client';
import { isEmpty } from 'lodash';
import { ComicPageService } from 'src/comic-page/comic-page.service';
import { Prisma, ComicIssue } from '@prisma/client';
import * as path from 'path';

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
    const { cover, soundtrack } = createComicIssueFilesDto;

    // Upload files if any
    let coverKey: string, soundtrackKey: string;
    try {
      if (cover) coverKey = await this.uploadFile(slug, cover);
      if (soundtrack) soundtrackKey = await this.uploadFile(slug, soundtrack);
    } catch {
      throw new BadRequestException('Malformed file upload');
    }

    try {
      // Upload comic pages and format data for INSERT
      const pagesData = await this.comicPageService.createMany(pages);

      const comicIssue = await this.prisma.comicIssue.create({
        include: { nfts: true, pages: true },
        data: {
          ...rest,
          slug,
          cover: coverKey,
          soundtrack: soundtrackKey,
          comic: { connect: { id: comicId } },
          pages: { createMany: { data: pagesData } },
          nfts: {
            createMany: {
              data: hashlist.map((hash) => ({ mint: hash })),
            },
          },
        },
      });

      return comicIssue;
    } catch {
      // Revert file upload
      if (coverKey) await deleteS3Object({ Key: coverKey });
      if (soundtrackKey) await deleteS3Object({ Key: soundtrackKey });
      // TODO: delete pagesData images and altImages
      throw new BadRequestException('Faulty comic issue data');
    }
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
      where: { slug },
    });

    if (!comicIssue) {
      throw new NotFoundException(`Comic issue ${slug} does not exist`);
    }

    return comicIssue;
  }

  async update(slug: string, updateComicIssueDto: UpdateComicIssueDto) {
    const { pages, ...rest } = updateComicIssueDto;

    // TODO: if name has changed, update folder names in the S3 bucket
    // TODO: move page updates to a different endpoint

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
          // TODO: check if pagesData = undefined will destroy all previous relations
          pages: { createMany: { data: pagesData } },
        },
      });
    } catch {
      throw new NotFoundException(`Comic issue ${slug} does not exist`);
    }

    return updatedComicIssue;
  }

  async updateFile(slug: string, file: Express.Multer.File) {
    const fileKey = await this.uploadFile(slug, file);
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
    // TODO: change this to /comics/{comicSlug}/issues/{comicIssueSlug}
    const keys = await listS3FolderKeys({ Prefix: `comic-issues/${slug}` });

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

  async uploadFile(slug: string, file: Express.Multer.File) {
    if (file) {
      const fileKey = `comic-issues/${slug}/${file.fieldname}${path.extname(
        file.originalname,
      )}`;

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
