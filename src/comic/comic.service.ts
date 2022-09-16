import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateComicDto } from './dto/create-comic.dto';
import { UpdateComicDto } from './dto/update-comic.dto';
import {
  deleteS3Objects,
  listS3FolderKeys,
  putS3Object,
} from '../aws/s3client';
import { isEmpty, snakeCase } from 'lodash';
import { ComicPageService } from 'src/comic-page/comic-page.service';
import { Prisma, Comic } from '@prisma/client';

@Injectable()
export class ComicService {
  constructor(
    private prisma: PrismaService,
    private comicPageService: ComicPageService,
  ) {}

  async create(createComicDto: CreateComicDto) {
    const { cover, collectionName, soundtrack, pages, ...rest } =
      createComicDto;

    // $transaction API?
    // try catch file uploads
    const coverKey = snakeCase(createComicDto.title) + '/cover.png';
    await putS3Object({
      // TODO v1.1: mimetype
      // ContentType: cover.mimetype,
      Key: coverKey,
      Body: cover.buffer,
    });

    const soundtrackKey = snakeCase(createComicDto.title) + '/soundtrack.txt';
    await putS3Object({ Key: soundtrackKey, Body: soundtrack.buffer });

    // Upload comic pages and format data for INSERT
    const pagesData = await this.comicPageService.createMany(pages);

    const comic = await this.prisma.comic.create({
      include: { pages: true },
      data: {
        ...rest,
        cover: coverKey,
        soundtrack: soundtrackKey,
        collection: { connect: { name: collectionName } },
        pages: { createMany: { data: pagesData } },
      },
    });

    return comic;
  }

  async findAll() {
    const comics = await this.prisma.comic.findMany();
    return comics;
  }

  async findOne(id: number) {
    const comic = await this.prisma.comic.findUnique({
      where: { id },
    });

    if (!comic) {
      throw new NotFoundException(`Comic with id ${id} does not exist`);
    }

    return comic;
  }

  async update(id: number, updateComicDto: UpdateComicDto) {
    const { cover, soundtrack, pages, ...rest } = updateComicDto;

    // $transaction API?
    // try catch file uploads
    let coverKey: string;
    if (cover) {
      coverKey = `comic-${id}/cover.png`;
      await putS3Object({ Key: coverKey, Body: cover.buffer });
    }

    let soundtrackKey: string;
    if (soundtrack) {
      soundtrackKey = `comic-${id}/soundtrack.txt`;
      await putS3Object({ Key: soundtrackKey, Body: soundtrack.buffer });
    }

    // Delete old comic pages
    let pagesData: Prisma.ComicPageCreateManyComicInput[];
    if (!isEmpty(pages)) {
      await this.comicPageService.removeComicPages({ comicId: id });

      // Upload new comic pages and format data for INSERT
      const comicPages = await this.comicPageService.createMany(pages);
    }

    let updatedComic: Comic;
    try {
      updatedComic = await this.prisma.comic.update({
        where: { id },
        include: { pages: true },
        data: {
          ...rest,
          // TODO: check if pagesData = undefined will destroy all relations
          pages: { createMany: { data: pagesData } },
        },
      });
    } catch {
      throw new NotFoundException(`Comic with id ${id} does not exist`);
    }

    return updatedComic;
  }

  // TODO: delete
  // async pseudoDelete(id: number) {
  //   try {
  //     await this.prisma.comic.update({
  //       where: { id },
  //       data: { deletedAt: new Date() },
  //     });
  //   } catch {
  //     throw new NotFoundException(`Comic with id ${id} does not exist`);
  //   }
  //   return;
  // }

  async remove(id: number) {
    // Remove s3 assets
    const keys = await listS3FolderKeys({ Prefix: `comics/${id}` });

    if (!isEmpty(keys)) {
      await deleteS3Objects({
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      });
    }

    try {
      const deleteComicPages = this.prisma.comicPage.deleteMany({
        where: { comicId: id },
      });
      const deleteComic = this.prisma.comic.delete({ where: { id } });
      await this.prisma.$transaction([deleteComicPages, deleteComic]);
    } catch {
      throw new NotFoundException(`Comic with id ${id} does not exist`);
    }
    return;
  }
}
