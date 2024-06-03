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

const s3Folder = 'genres/';
type GenreFileProperty = PickFields<Genre, 'icon'>;

@Injectable()
export class GenreService {
  constructor(
    private readonly s3: s3Service,
    private readonly prisma: PrismaService,
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
      throw new BadRequestException('Bad genre data');
    }

    const { icon } = createGenreFilesDto;

    let iconKey: string;
    try {
      if (icon)
        iconKey = await this.s3.uploadFile(icon, { s3Folder, fileName: slug });
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
      throw new NotFoundException(`Genre ${slug} does not exist`);
    } else if (genre.comics.length > 0) {
      throw new ForbiddenException("Cannot delete genre that's being used");
    }

    await this.prisma.genre.delete({ where: { slug } });
    await this.s3.deleteObject(genre.slug);
  }
}
