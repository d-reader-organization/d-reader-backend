import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import {
  CreateComicDto,
  CreateComicFilesDto,
} from 'src/comic/dto/create-comic.dto';
import { UpdateComicDto } from 'src/comic/dto/update-comic.dto';
import {
  deleteS3Object,
  deleteS3Objects,
  listS3FolderKeys,
  uploadFile,
} from '../aws/s3client';
import { isEmpty } from 'lodash';
import { Comic, ComicIssue } from '@prisma/client';

@Injectable()
export class ComicService {
  constructor(private prisma: PrismaService) {}

  async create(
    creatorId: number,
    createComicDto: CreateComicDto,
    createComicFilesDto: CreateComicFilesDto,
  ) {
    const { slug, ...rest } = createComicDto;

    // Create Comic without any files uploaded
    let comic: Comic & { issues: ComicIssue[] };
    try {
      comic = await this.prisma.comic.create({
        include: { issues: true },
        data: { ...rest, slug, creatorId },
      });
    } catch {
      throw new BadRequestException('Bad comic data');
    }

    const { thumbnail, pfp, logo } = createComicFilesDto;

    // Upload files if any
    let thumbnailKey: string, pfpKey: string, logoKey: string;
    try {
      const prefix = await this.getS3FilePrefix(slug);
      if (thumbnail) thumbnailKey = await uploadFile(prefix, thumbnail);
      if (pfp) pfpKey = await uploadFile(prefix, pfp);
      if (logo) logoKey = await uploadFile(prefix, logo);
    } catch {
      await this.prisma.comic.delete({ where: { id: comic.id } });
      throw new BadRequestException('Malformed file upload');
    }

    // Update Comic with s3 file keys
    comic = await this.prisma.comic.update({
      where: { id: comic.id },
      include: { issues: true },
      data: {
        thumbnail: thumbnailKey,
        pfp: pfpKey,
        logo: logoKey,
      },
    });

    return comic;
  }

  async findAll() {
    const comics = await this.prisma.comic.findMany({
      where: {
        deletedAt: null,
        publishedAt: { lt: new Date() },
        verifiedAt: { not: null },
      },
    });
    return comics;
  }

  async findOne(slug: string) {
    const comic = await this.prisma.comic.findUnique({
      where: { slug },
    });

    if (!comic) {
      throw new NotFoundException(`Comic ${slug} does not exist`);
    }

    return comic;
  }

  async update(slug: string, updateComicDto: UpdateComicDto) {
    try {
      const updatedComic = await this.prisma.comic.update({
        where: { slug },
        data: updateComicDto,
      });

      return updatedComic;
    } catch {
      throw new NotFoundException(`Comic ${slug} does not exist`);
    }
  }

  async updateFile(slug: string, file: Express.Multer.File) {
    const prefix = await this.getS3FilePrefix(slug);
    const fileKey = await uploadFile(prefix, file);
    try {
      const updatedComic = await this.prisma.comic.update({
        where: { slug },
        data: { [file.fieldname]: fileKey },
      });

      return updatedComic;
    } catch {
      // Revert file upload
      await deleteS3Object({ Key: fileKey });
      throw new NotFoundException(`Comic ${slug} does not exist`);
    }
  }

  async publish(slug: string) {
    try {
      await this.prisma.comic.update({
        where: { slug },
        data: { publishedAt: new Date() },
      });
    } catch {
      throw new NotFoundException(`Comic ${slug} does not exist`);
    }
  }

  async unpublish(slug: string) {
    try {
      await this.prisma.comic.update({
        where: { slug },
        data: { publishedAt: null },
      });
    } catch {
      throw new NotFoundException(`Comic ${slug} does not exist`);
    }
  }

  async pseudoDelete(slug: string) {
    try {
      await this.prisma.comic.update({
        where: { slug },
        data: { deletedAt: new Date() },
      });
    } catch {
      throw new NotFoundException(`Comic ${slug} does not exist`);
    }
  }

  async pseudoRecover(slug: string) {
    try {
      await this.prisma.comic.update({
        where: { slug },
        data: { deletedAt: null },
      });
    } catch {
      throw new NotFoundException(`Comic ${slug} does not exist`);
    }
  }

  async remove(slug: string) {
    // Remove s3 assets
    const prefix = await this.getS3FilePrefix(slug);
    const keys = await listS3FolderKeys({ Prefix: prefix });

    if (!isEmpty(keys)) {
      await deleteS3Objects({
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      });
    }

    try {
      await this.prisma.comic.delete({ where: { slug } });
    } catch {
      throw new NotFoundException(`Comic ${slug} does not exist`);
    }
    return;
  }

  async getS3FilePrefix(slug: string) {
    const comic = await this.prisma.comic.findUnique({
      where: { slug },
      select: {
        slug: true,
        creator: { select: { slug: true } },
      },
    });

    if (!comic) {
      throw new NotFoundException(`Comic ${slug} does not exist`);
    }

    const prefix = `creators/${comic.creator.slug}/comics/${comic.slug}/`;
    return prefix;
  }
}
