import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import {
  CreateCarouselSlideDto,
  CreateCarouselSlideFilesDto,
  CreateCarouselSlideTranslationDto,
} from '../carousel/dto/create-carousel-slide.dto';
import { UpdateCarouselSlideDto } from '../carousel/dto/update-carousel-slide.dto';
import { CarouselSlideTranslation, Language } from '@prisma/client';
import { addDays } from 'date-fns';
import { s3Service } from '../aws/s3.service';
import { PickFields } from '../types/shared';
import {
  flattenTranslations,
  flattenTranslationsArray,
} from '../utils/helpers';
import { TranslatedCarouselSlide } from './dto/carousel-slide.dto';

const S3_FOLDER = 'carousel/slides/';
type CarouselSlideFileProperty = PickFields<CarouselSlideTranslation, 'image'>;

@Injectable()
export class CarouselService {
  constructor(
    private readonly s3: s3Service,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    createCarouselSlideDto: CreateCarouselSlideDto,
    createCarouselSlideFilesDto: CreateCarouselSlideFilesDto,
  ): Promise<TranslatedCarouselSlide> {
    const { image } = createCarouselSlideFilesDto;
    const { title, lang, subtitle } = createCarouselSlideDto;
    const language = lang ?? Language.English;

    let imageKey: string;
    try {
      imageKey = await this.s3.uploadFile(S3_FOLDER, image);
    } catch {
      throw new BadRequestException('Malformed file upload');
    }

    try {
      return await this.prisma.carouselSlide
        .create({
          data: {
            ...createCarouselSlideDto,
            // expires in 30 days by default, change this in the future
            expiredAt: addDays(new Date(), 30),
            publishedAt: new Date(),
            translations: {
              create: {
                image: imageKey,
                language,
                subtitle,
                title,
              },
            },
          },
          include: {
            translations: {
              where: {
                OR: [{ language }, { language: Language.English }],
              },
              orderBy: { language: 'asc' },
            },
          },
        })
        .then(flattenTranslations);
    } catch {
      throw new BadRequestException('Bad carousel slide data');
    }
  }

  async addTranslation(
    id: number,
    createCarouselSlideTranslationDto: CreateCarouselSlideTranslationDto,
    createCarouselSlideFilesDto: CreateCarouselSlideFilesDto,
  ) {
    const { image } = createCarouselSlideFilesDto;
    const { title, subtitle, lang } = createCarouselSlideTranslationDto;
    const language = lang ?? Language.English;

    let imageKey: string;
    try {
      imageKey = await this.s3.uploadFile(S3_FOLDER, image);
    } catch {
      throw new BadRequestException('Malformed file upload');
    }
    try {
      await this.prisma.carouselSlideTranslation.create({
        data: {
          image: imageKey,
          language,
          title,
          subtitle,
          slide: { connect: { id } },
        },
      });
    } catch {
      throw new BadRequestException('Bad carousel slide translation data');
    }
  }

  async findAll(language: Language): Promise<TranslatedCarouselSlide[]> {
    return await this.prisma.carouselSlide
      .findMany({
        where: {
          expiredAt: { gt: new Date() },
          publishedAt: { lt: new Date() },
        },
        orderBy: { priority: 'asc' },
        include: {
          translations: {
            where: { OR: [{ language }, { language: Language.English }] },
            orderBy: { language: 'asc' },
          },
        },
      })
      .then(flattenTranslationsArray);
  }

  async findOne(
    id: number,
    language: Language,
  ): Promise<TranslatedCarouselSlide> {
    const carouselSlide = await this.prisma.carouselSlide
      .findUnique({
        where: { id },
        include: {
          translations: {
            where: {
              OR: [{ language }, { language: Language.English }],
            },
            orderBy: { language: 'asc' },
          },
        },
      })
      .then(flattenTranslations);

    if (!carouselSlide) {
      throw new NotFoundException(`Carousel slide with ${id} does not exist`);
    }
    return carouselSlide;
  }

  async update(id: number, updateCarouselSlideDto: UpdateCarouselSlideDto) {
    try {
      await this.prisma.carouselSlide.update({
        where: { id },
        data: updateCarouselSlideDto,
      });
    } catch {
      throw new NotFoundException(`Carousel slide with ${id} does not exist`);
    }
  }

  async updateFile(
    id: number,
    file: Express.Multer.File,
    field: CarouselSlideFileProperty,
    language: Language,
  ) {
    let translatedCarouselSlide = await this.findOne(id, language);

    const oldFileKey = translatedCarouselSlide[field];
    const newFileKey = await this.s3.uploadFile(S3_FOLDER, file);

    try {
      const { slide, ...translations } =
        await this.prisma.carouselSlideTranslation.update({
          where: { slideId_language: { slideId: id, language } },
          data: { [field]: newFileKey },
          include: { slide: true },
        });
      translatedCarouselSlide = { ...slide, ...translations };
    } catch {
      await this.s3.deleteObject(newFileKey);
      throw new BadRequestException('Malformed file upload');
    }

    await this.s3.garbageCollectOldFile(newFileKey, oldFileKey);
    return translatedCarouselSlide;
  }

  async expire(id: number) {
    try {
      await this.prisma.carouselSlide.update({
        where: { id },
        data: { expiredAt: new Date() },
      });
    } catch {
      throw new NotFoundException(`Carousel slide with ${id} does not exist`);
    }
  }
}
