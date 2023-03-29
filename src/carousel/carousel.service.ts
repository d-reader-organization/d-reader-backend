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
import { deleteS3Object, uploadFile } from '../aws/s3client';
import { CarouselSlide } from '@prisma/client';
import { addDays } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CarouselService {
  constructor(private prisma: PrismaService) {}

  async create(
    createCarouselSlideDto: CreateCarouselSlideDto,
    createCarouselSlideFilesDto: CreateCarouselSlideFilesDto,
  ) {
    const { image } = createCarouselSlideFilesDto;

    let imageKey: string;
    try {
      const prefix = await this.getS3FilePrefix();
      imageKey = await uploadFile(prefix, image, uuidv4());
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

  async updateFile(id: number, file: Express.Multer.File) {
    let carouselSlide = await this.findOne(id);
    const oldFileKey = carouselSlide[file.fieldname];
    const prefix = await this.getS3FilePrefix();
    const newFileKey = await uploadFile(prefix, file, uuidv4());

    try {
      carouselSlide = await this.prisma.carouselSlide.update({
        where: { id },
        data: { [file.fieldname]: newFileKey },
      });
    } catch {
      await deleteS3Object({ Key: newFileKey });
      throw new BadRequestException('Malformed file upload');
    }

    // carousel slides use uuid for s3 keys so we will always
    // have to garbage collect the old file
    await deleteS3Object({ Key: oldFileKey });

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

  async getS3FilePrefix() {
    return `carousel/slides/`;
  }
}
