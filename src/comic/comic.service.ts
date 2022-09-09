import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateComicDto } from './dto/create-comic.dto';
import { UpdateComicDto } from './dto/update-comic.dto';

@Injectable()
export class ComicService {
  constructor(private prisma: PrismaService) {}

  async create(createComicDto: CreateComicDto) {
    // TODO: change thumbnail, soundtrac etc. to files
    const comic = await this.prisma.comic.create({
      data: createComicDto,
    });

    return comic;
  }

  async findAll() {
    // TODO: include relations
    const comics = await this.prisma.comic.findMany();
    return comics;
  }

  async findOne(id: number) {
    // TODO: include relations
    const comic = await this.prisma.comic.findUnique({
      where: { id },
    });

    if (!comic) {
      throw new NotFoundException(`Comic with id ${id} does not exist`);
    }

    return comic;
  }

  async update(id: number, updateComicDto: UpdateComicDto) {
    let updatedComic;
    try {
      updatedComic = await this.prisma.comic.update({
        where: { id },
        // TODO: handle file uploads
        data: updateComicDto,
      });
    } catch {
      throw new NotFoundException(`Comic with id ${id} does not exist`);
    }

    return updatedComic;
  }

  async remove(id: number) {
    try {
      await this.prisma.comic.delete({ where: { id } });
    } catch {
      throw new NotFoundException(`Comic with id ${id} does not exist`);
    }
    return;
  }
}
