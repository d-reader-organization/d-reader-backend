import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import {
  CreateCarouselSlideBodyDto,
  CreateCarouselSlideFilesDto,
} from '../carousel/dto/create-carousel-slide.dto';
import { UpdateCarouselSlideDto } from '../carousel/dto/update-carousel-slide.dto';
import { CarouselSlide } from '@prisma/client';
import { addDays } from 'date-fns';
import { s3Service } from '../aws/s3.service';
import { PickFields } from '../types/shared';
import { CarouselSlideFilterParams } from './dto/carousel-slide-params.dto';

const s3Folder = 'carousel/slides/';
type CarouselSlideFileProperty = PickFields<CarouselSlide, 'image'>;

@Injectable()
export class CarouselService {
  constructor(
    private readonly s3: s3Service,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    createCarouselSlideBodyDto: CreateCarouselSlideBodyDto,
    createCarouselSlideFilesDto: CreateCarouselSlideFilesDto,
  ) {
    const { image } = createCarouselSlideFilesDto;

    let imageKey: string;
    try {
      imageKey = await this.s3.uploadFile(image, { s3Folder });
    } catch {
      throw new BadRequestException('Malformed file upload');
    }

    let carouselSlide: CarouselSlide;
    try {
      // expires in 30 days by default
      const expiredAt =
        createCarouselSlideBodyDto.expiredAt ?? addDays(new Date(), 30);

      carouselSlide = await this.prisma.carouselSlide.create({
        data: {
          ...createCarouselSlideBodyDto,
          expiredAt,
          publishedAt: new Date(),
          image: imageKey,
        },
      });
    } catch (e) {
      console.error(e);
      throw new BadRequestException('Bad carousel slide data');
    }

    return carouselSlide;
  }

  async findAll(params: CarouselSlideFilterParams) {
    const carouselSlides = await this.prisma.carouselSlide.findMany({
      where: {
        expiredAt: { gt: params.getExpired ? undefined : new Date() },
        publishedAt: { lt: new Date() },
      },
      orderBy: { priority: 'asc' },
    });
    return carouselSlides;
  }

  async findOne(id: number) {
    const carouselSlide = await this.prisma.carouselSlide.findUnique({
      where: { id },
    });

    if (!carouselSlide) {
      throw new NotFoundException(`Carousel slide with id ${id} not found`);
    }

    return carouselSlide;
  }

  async update(id: number, updateCarouselSlideDto: UpdateCarouselSlideDto) {
    try {
      const updatedCarouselSlide = await this.prisma.carouselSlide.update({
        where: { id },
        data: updateCarouselSlideDto,
      });

      return updatedCarouselSlide;
    } catch {
      throw new NotFoundException(`Carousel slide with id ${id} not found`);
    }
  }

  async updateFile(
    id: number,
    file: Express.Multer.File,
    field: CarouselSlideFileProperty,
  ) {
    let carouselSlide = await this.findOne(id);

    const oldFileKey = carouselSlide[field];
    const newFileKey = await this.s3.uploadFile(file, { s3Folder });

    try {
      carouselSlide = await this.prisma.carouselSlide.update({
        where: { id },
        data: { [field]: newFileKey },
      });
    } catch {
      await this.s3.garbageCollectNewFile(newFileKey, oldFileKey);
      throw new BadRequestException('Malformed file upload');
    }

    await this.s3.garbageCollectOldFile(newFileKey, oldFileKey);
    return carouselSlide;
  }

  async expire(id: number) {
    try {
      return await this.prisma.carouselSlide.update({
        where: { id },
        data: { expiredAt: new Date() },
      });
    } catch {
      throw new NotFoundException(`Carousel slide with id ${id} not found`);
    }
  }
}
