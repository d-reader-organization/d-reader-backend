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
import { CarouselSlide } from '@prisma/client';
import { addDays } from 'date-fns';
import { s3Service } from '../aws/s3.service';
import { PickFields } from '../types/shared';

const S3_FOLDER = 'carousel/slides/';
type CarouselSlideFileProperty = PickFields<CarouselSlide, 'image'>;

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

    let imageKey: string;
    try {
      imageKey = await this.s3.uploadFile(S3_FOLDER, image);
    } catch {
      throw new BadRequestException('Malformed file upload');
    }

    let carouselSlide: CarouselSlide;
    try {
      carouselSlide = await this.prisma.carouselSlide.create({
        data: {
          ...createCarouselSlideDto,
          // expires in 30 days by default, change this in the future
          expiredAt: addDays(new Date(), 30),
          publishedAt: new Date(),
          image: imageKey,
        },
      });
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

  async findOne(id: number) {
    const carouselSlide = await this.prisma.carouselSlide.findUnique({
      where: { id },
    });

    if (!carouselSlide) {
      throw new NotFoundException(`Carousel slide with ${id} does not exist`);
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
      throw new NotFoundException(`Carousel slide with ${id} does not exist`);
    }
  }

  async updateFile(
    id: number,
    file: Express.Multer.File,
    field: CarouselSlideFileProperty,
  ) {
    let carouselSlide = await this.findOne(id);

    const oldFileKey = carouselSlide[field];
    const newFileKey = await this.s3.uploadFile(S3_FOLDER, file);

    try {
      carouselSlide = await this.prisma.carouselSlide.update({
        where: { id },
        data: { [field]: newFileKey },
      });
    } catch {
      await this.s3.deleteObject(newFileKey);
      throw new BadRequestException('Malformed file upload');
    }

    if (oldFileKey !== newFileKey) {
      await this.s3.deleteObject(oldFileKey);
    }

    return carouselSlide;
  }

  async expire(id: number) {
    try {
      return await this.prisma.carouselSlide.update({
        where: { id },
        data: { expiredAt: new Date() },
      });
    } catch {
      throw new NotFoundException(`Carousel slide with ${id} does not exist`);
    }
  }
}
