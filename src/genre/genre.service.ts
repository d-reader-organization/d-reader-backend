import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import {
  CreateGenreBodyDto,
  CreateGenreFilesDto,
} from '../genre/dto/create-genre.dto';
import { UpdateGenreDto } from '../genre/dto/update-genre.dto';
import { Genre } from '@prisma/client';
import { GenreFilterParams } from './dto/genre-params.dto';
import { s3Service } from '../aws/s3.service';
import { PickFields } from '../types/shared';
import { CacheService } from '../cache/cache.service';
import { CachePath } from '../utils/cache';
import { ERROR_MESSAGES } from '../utils/errors';

const s3Folder = 'genres/';
type GenreFileProperty = PickFields<Genre, 'icon'>;

@Injectable()
export class GenreService {
  constructor(
    private readonly s3: s3Service,
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async create(
    createGenreBodyDto: CreateGenreBodyDto,
    createGenreFilesDto: CreateGenreFilesDto,
  ) {
    const { slug, ...rest } = createGenreBodyDto;

    let genre: Genre;
    try {
      genre = await this.prisma.genre.create({ data: { ...rest, slug } });
    } catch (e) {
      console.error(e);
      throw new BadRequestException(ERROR_MESSAGES.BAD_GENRE_DATA);
    }

    const { icon } = createGenreFilesDto;

    let iconKey: string;
    try {
      if (icon)
        iconKey = await this.s3.uploadFile(icon, { s3Folder, fileName: slug });
    } catch {
      await this.prisma.genre.delete({ where: { slug } });
      throw new BadRequestException(ERROR_MESSAGES.MALFORMED_FILE_UPLOAD);
    }

    genre = await this.prisma.genre.update({
      where: { slug },
      data: { icon: iconKey },
    });

    await this.cacheService.deleteByPattern(CachePath.GENRE_GET_MANY);
    return genre;
  }

  async findAll(query: GenreFilterParams) {
    const genres = await this.prisma.genre.findMany({
      skip: query?.skip,
      take: query?.take,
      orderBy: { priority: 'asc' },
    });
    return genres;
  }

  async findOne(slug: string) {
    const genre = await this.prisma.genre.findUnique({ where: { slug } });

    if (!genre) {
      throw new NotFoundException(ERROR_MESSAGES.GENRE_NOT_FOUND(slug));
    }

    return genre;
  }

  async update(slug: string, updateGenreDto: UpdateGenreDto) {
    try {
      const updatedGenre = await this.prisma.genre.update({
        where: { slug },
        data: updateGenreDto,
      });

      await this.cacheService.deleteByPattern(CachePath.GENRE_GET_MANY);
      return updatedGenre;
    } catch {
      throw new NotFoundException(ERROR_MESSAGES.GENRE_NOT_FOUND(slug));
    }
  }

  async updateFile(
    slug: string,
    file: Express.Multer.File,
    field: GenreFileProperty,
  ) {
    let genre = await this.findOne(slug);

    const oldFileKey = genre[field];
    const newFileKey = await this.s3.uploadFile(file, {
      s3Folder,
      fileName: slug,
    });

    try {
      genre = await this.prisma.genre.update({
        where: { slug },
        data: { [field]: newFileKey },
      });
    } catch {
      await this.s3.garbageCollectNewFile(newFileKey, oldFileKey);
      throw new BadRequestException('Malformed file upload');
    }

    await this.s3.garbageCollectOldFile(newFileKey, oldFileKey);
    return genre;
  }

  async delete(slug: string) {
    const genre = await this.prisma.genre.findUnique({
      where: { slug },
      include: { comics: true },
    });

    if (!genre) {
      throw new NotFoundException(ERROR_MESSAGES.GENRE_NOT_FOUND(slug));
    } else if (genre.comics.length > 0) {
      throw new ForbiddenException(ERROR_MESSAGES.CANNOT_DELETE_USED_GENRE);
    }

    await this.prisma.genre.delete({ where: { slug } });
    await this.s3.deleteObject(genre.slug);
  }
}
