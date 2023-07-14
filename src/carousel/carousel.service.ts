import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import {
  CreateCarouselSlideDto,
  CreateCarouselSlideFilesDto,
} from '../carousel/dto/create-carousel-slide.dto';
import { UpdateCarouselSlideDto } from '../carousel/dto/update-carousel-slide.dto';
import { CarouselSlideTranslation, Language } from '@prisma/client';
import { addDays } from 'date-fns';
import { s3Service } from '../aws/s3.service';
import { PickFields } from '../types/shared';
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
  ) {
    const { image } = createCarouselSlideFilesDto;
    const { title, lang, subtitle } = createCarouselSlideDto;

    let imageKey: string;
    try {
      imageKey = await this.s3.uploadFile(S3_FOLDER, image);
    } catch {
      throw new BadRequestException('Malformed file upload');
    }

    let carouselSlide: TranslatedCarouselSlide;
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
                language: lang,
                subtitle,
                title,
              },
            },
          },
          include: {
            translations: { where: { language: lang } },
          },
        })
        .then(({ translations, ...slide }) => ({
          ...translations[0],
          ...slide,
        }));
    } catch {
      throw new BadRequestException('Bad carousel slide data');
    }
    return carouselSlide;
  }

  async findAll() {
    const carouselSlides = await this.prisma.carouselSlide.findMany({
      where: {
        expiredAt: { gt: new Date() },
        publishedAt: { lt: new Date() },
      },
      orderBy: { priority: 'asc' },
    });
    return carouselSlides;
  }

  async findOne(id: number, language: Language) {
    const { translations, ...slide } =
      await this.prisma.carouselSlide.findUnique({
        where: { id },
        include: { translations: { where: { language } } },
      });

    if (!slide) {
      throw new NotFoundException(`Carousel slide with ${id} does not exist`);
    }
    return { ...slide, ...translations[0] };
  }

  async update(
    id: number,
    updateCarouselSlideDto: UpdateCarouselSlideDto,
    language: Language,
  ) {
    try {
      return await this.prisma.carouselSlide
        .update({
          where: { id },
          data: updateCarouselSlideDto,
          include: { translations: { where: { language } } },
        })
        .then(({ translations, ...slide }) => ({
          ...translations[0],
          ...slide,
        }));
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
    let carouselSlideTranslation = await this.findOne(id, language);

    const oldFileKey = carouselSlideTranslation[field];
    const newFileKey = await this.s3.uploadFile(S3_FOLDER, file);

    try {
      const { slide, ...translations } =
        await this.prisma.carouselSlideTranslation.update({
          where: { slideId_language: { slideId: id, language } },
          data: { [field]: newFileKey },
          include: { slide: true },
        });
      carouselSlideTranslation = { ...slide, ...translations };
    } catch {
      await this.s3.deleteObject(newFileKey);
      throw new BadRequestException('Malformed file upload');
    }

    await this.s3.garbageCollectOldFile(newFileKey, oldFileKey);
    return carouselSlideTranslation;
  }

  async expire(id: number, language: Language) {
    try {
      return await this.prisma.carouselSlide
        .update({
          where: { id },
          data: { expiredAt: new Date() },
          include: {
            translations: { where: { language } },
          },
        })
        .then(({ translations, ...slide }) => ({
          ...translations[0],
          ...slide,
        }));
    } catch {
      throw new NotFoundException(`Carousel slide with ${id} does not exist`);
    }
  }
}
