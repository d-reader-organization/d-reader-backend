import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import {
  CreateGenreDto,
  CreateGenreFilesDto,
} from '../genre/dto/create-genre.dto';
import { UpdateGenreDto } from '../genre/dto/update-genre.dto';
import { Genre } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { subDays } from 'date-fns';
import { GenreFilterParams } from './dto/genre-filter-params.dto';
import { s3Service } from '../aws/s3.service';

@Injectable()
export class GenreService {
  constructor(
    private readonly s3: s3Service,
    private readonly prisma: PrismaService,
  ) {}

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

    const { icon } = createGenreFilesDto;

    // Upload files if any
    let iconKey: string;
    try {
      const prefix = await this.getS3FilePrefix(slug);
      if (icon) iconKey = await this.s3.uploadFile(prefix, icon);
    } catch {
      await this.prisma.genre.delete({ where: { slug } });
      throw new BadRequestException('Malformed file upload');
    }

    // Update Genre with s3 file keys
    genre = await this.prisma.genre.update({
      where: { slug },
      data: { icon: iconKey },
    });

    return genre;
  }

  async findAll(query: GenreFilterParams) {
    const genres = await this.prisma.genre.findMany({
      skip: query?.skip,
      take: query?.take,
      where: { deletedAt: null },
      orderBy: { priority: 'asc' },
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
    let genre = await this.findOne(slug);
    const oldFileKey = genre[file.fieldname];
    const prefix = await this.getS3FilePrefix(slug);
    const newFileKey = await this.s3.uploadFile(prefix, file);

    try {
      genre = await this.prisma.genre.update({
        where: { slug },
        data: { [file.fieldname]: newFileKey },
      });
    } catch {
      await this.s3.deleteObject({ Key: newFileKey });
      throw new BadRequestException('Malformed file upload');
    }

    if (oldFileKey !== newFileKey) {
      await this.s3.deleteObject({ Key: oldFileKey });
    }

    return genre;
  }

  async pseudoDelete(slug: string) {
    try {
      return await this.prisma.genre.update({
        where: { slug },
        data: { deletedAt: new Date() },
      });
    } catch {
      throw new NotFoundException(`Genre ${slug} does not exist`);
    }
  }

  async pseudoRecover(slug: string) {
    try {
      return await this.prisma.genre.update({
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
    const keys = await this.s3.listFolderKeys({ Prefix: prefix });
    await this.s3.deleteObjects(keys);

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
