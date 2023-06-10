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
import { PickFields } from '../types/shared';

const S3_FOLDER = 'genres/';
type GenreFileProperty = PickFields<Genre, 'icon'>;

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

    let genre: Genre;
    try {
      genre = await this.prisma.genre.create({ data: { ...rest, slug } });
    } catch {
      throw new BadRequestException('Bad genre data');
    }

    const { icon } = createGenreFilesDto;

    let iconKey: string;
    try {
      if (icon) iconKey = await this.s3.uploadFile(S3_FOLDER, icon, slug);
    } catch {
      await this.prisma.genre.delete({ where: { slug } });
      throw new BadRequestException('Malformed file upload');
    }

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

  async updateFile(
    slug: string,
    file: Express.Multer.File,
    field: GenreFileProperty,
  ) {
    let genre = await this.findOne(slug);

    const oldFileKey = genre[field];
    const newFileKey = await this.s3.uploadFile(S3_FOLDER, file, slug);

    try {
      genre = await this.prisma.genre.update({
        where: { slug },
        data: { [field]: newFileKey },
      });
    } catch {
      await this.s3.deleteObject(newFileKey);
      throw new BadRequestException('Malformed file upload');
    }

    if (oldFileKey !== newFileKey) {
      await this.s3.deleteObject(oldFileKey);
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

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async clearGenresQueuedForRemoval() {
    const where = { where: { deletedAt: { lte: subDays(new Date(), 90) } } };
    const genresToRemove = await this.prisma.genre.findMany(where);
    await this.prisma.genre.deleteMany(where);

    const keys = genresToRemove.map((g) => g.icon);
    await this.s3.deleteObjects(keys);
  }
}
