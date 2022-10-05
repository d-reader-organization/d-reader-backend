import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import {
  CreateGenreDto,
  CreateGenreFilesDto,
} from 'src/genre/dto/create-genre.dto';
import { UpdateGenreDto } from 'src/genre/dto/update-genre.dto';
import {
  deleteS3Object,
  deleteS3Objects,
  listS3FolderKeys,
  uploadFile,
} from '../aws/s3client';
import { isEmpty } from 'lodash';
import { Genre } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { subDays } from 'date-fns';

@Injectable()
export class GenreService {
  constructor(private prisma: PrismaService) {}

  async create(
    createGenreDto: CreateGenreDto,
    createGenreFilesDto: CreateGenreFilesDto,
  ) {
    const { slug, ...rest } = createGenreDto;

    // Create Genre without any files uploaded
    let genre: Genre;
    try {
      genre = await this.prisma.genre.create({ data: { ...rest, slug } });
    } catch {
      throw new BadRequestException('Bad genre data');
    }

    const { image } = createGenreFilesDto;

    // Upload files if any
    let imageKey: string;
    try {
      const prefix = await this.getS3FilePrefix(slug);
      if (image) imageKey = await uploadFile(prefix, image);
    } catch {
      await this.prisma.genre.delete({ where: { slug } });
      throw new BadRequestException('Malformed file upload');
    }

    // Update Genre with s3 file keys
    genre = await this.prisma.genre.update({
      where: { slug },
      data: { image: imageKey },
    });

    return genre;
  }

  async findAll() {
    const genres = await this.prisma.genre.findMany({
      where: { deletedAt: null },
    });
    return genres;
  }

  async findOne(slug: string) {
    const genre = await this.prisma.genre.findUnique({ where: { slug } });

    if (!genre) {
      throw new NotFoundException(`Genre ${slug} does not exist`);
    }

    return genre;
  }

  async update(slug: string, updateGenreDto: UpdateGenreDto) {
    try {
      const updatedGenre = await this.prisma.genre.update({
        where: { slug },
        data: updateGenreDto,
      });

      return updatedGenre;
    } catch {
      throw new NotFoundException(`Genre ${slug} does not exist`);
    }
  }

  async updateFile(slug: string, file: Express.Multer.File) {
    const prefix = await this.getS3FilePrefix(slug);
    const fileKey = await uploadFile(prefix, file);
    try {
      const updatedGenre = await this.prisma.genre.update({
        where: { slug },
        data: { [file.fieldname]: fileKey },
      });

      return updatedGenre;
    } catch {
      // Revert file upload
      await deleteS3Object({ Key: fileKey });
      throw new NotFoundException(`Genre ${slug} does not exist`);
    }
  }

  async pseudoDelete(slug: string) {
    try {
      await this.prisma.genre.update({
        where: { slug },
        data: { deletedAt: new Date() },
      });
    } catch {
      throw new NotFoundException(`Genre ${slug} does not exist`);
    }
  }

  async pseudoRecover(slug: string) {
    try {
      await this.prisma.genre.update({
        where: { slug },
        data: { deletedAt: null },
      });
    } catch {
      throw new NotFoundException(`Genre ${slug} does not exist`);
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
      await this.prisma.genre.delete({ where: { slug } });
    } catch {
      throw new NotFoundException(`Genre ${slug} does not exist`);
    }
    return;
  }

  async getS3FilePrefix(slug: string) {
    const genre = await this.prisma.genre.findUnique({
      where: { slug },
      select: { slug: true },
    });

    if (!genre) {
      throw new NotFoundException(`Genre ${slug} does not exist`);
    }

    const prefix = `genres/${slug}/`;
    return prefix;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async clearGenresQueuedForRemoval() {
    const genresToRemove = await this.prisma.genre.findMany({
      where: { deletedAt: { lte: subDays(new Date(), 90) } }, // 90 days ago
    });

    for (const genre of genresToRemove) {
      await this.remove(genre.slug);
      console.log(`Removed genre ${genre.slug} at ${new Date()}`);
    }
  }
}
