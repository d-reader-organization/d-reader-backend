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
import { CarouselSlide, CouponType } from '@prisma/client';
import { addDays, differenceInMonths } from 'date-fns';
import { s3Service } from '../aws/s3.service';
import { PickFields } from '../types/shared';
import {
  CarouselTag,
  CarouselTagTitle,
  CarouselTagType,
  CarouselWithTags,
} from '../types/carousel';
import { GetCarouselSlidesParams } from './dto/carousel-slide-params.dto';
import { TENSOR_TRADE_URL } from '../constants';

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

  async findAll({
    isExpired,
    location,
    take,
  }: GetCarouselSlidesParams): Promise<CarouselWithTags[]> {
    const carouselSlides = await this.prisma.carouselSlide.findMany({
      where: {
        expiredAt: !isExpired ? { gt: new Date() } : undefined,
        publishedAt: { lt: new Date() },
        location,
      },
      take,
      orderBy: { priority: 'asc' },
    });
    return await Promise.all(
      carouselSlides.map<Promise<CarouselWithTags>>(async (slide) => {
        const tags: CarouselTag[] = [];
        if (slide.externalLink) {
          tags.push({
            title: CarouselTagTitle.Highlighted,
            type: CarouselTagType.Chip,
          });
          tags.push({
            title: CarouselTagTitle.Explore,
            type: CarouselTagType.Button,
          });
        } else if (slide.comicSlug) {
          await this.handleComicCase({ slide, tags });
        } else if (slide.creatorSlug) {
          await this.handleCreatorCase({ slide, tags });
        } else if (slide.comicIssueId) {
          await this.handleComicIssueCase({ slide, tags });
        }
        return { ...slide, tags };
      }),
    );
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

  async handleComicCase({
    slide,
    tags,
  }: {
    slide: CarouselSlide;
    tags: CarouselTag[];
  }) {
    const comic = await this.prisma.comic.findFirst({
      where: { slug: slide.comicSlug },
    });
    const isNew = !differenceInMonths(new Date(), comic.publishedAt);
    if (isNew) {
      tags.push({
        title: CarouselTagTitle.NewComic,
        type: CarouselTagType.Chip,
      });
    }
    tags.push({
      title: CarouselTagTitle.Explore,
      type: CarouselTagType.Button,
    });
  }

  async handleCreatorCase({
    slide,
    tags,
  }: {
    slide: CarouselSlide;
    tags: CarouselTag[];
  }) {
    const creator = await this.prisma.creator.findFirst({
      where: { slug: slide.creatorSlug },
    });
    const isNew = !differenceInMonths(new Date(), creator.verifiedAt);
    if (isNew) {
      tags.push({
        title: CarouselTagTitle.NewCreator,
        type: CarouselTagType.Chip,
      });
    }
    tags.push({
      title: CarouselTagTitle.Explore,
      type: CarouselTagType.Button,
    });
  }

  async handleComicIssueCase({
    slide,
    tags,
  }: {
    slide: CarouselSlide;
    tags: CarouselTag[];
  }) {
    const comicIssue = await this.prisma.comicIssue.findFirst({
      where: {
        id: slide.comicIssueId,
      },
      include: { collectibleComicCollection: true },
    });

    if (!comicIssue.collectibleComicCollection && comicIssue.isFreeToRead) {
      tags.push({
        title: CarouselTagTitle.Free,
        type: CarouselTagType.Chip,
      });

      tags.push({
        title: CarouselTagTitle.Explore,
        type: CarouselTagType.Button,
      });
      return;
    }

    const activeCandyMachine = await this.prisma.candyMachine.findFirst({
      include: {
        coupons: true,
      },
      where: {
        collection: { comicIssueId: slide.comicIssueId },
        itemsRemaining: { gt: 0 },
        coupons: {
          some: {
            OR: [{ expiresAt: { gt: new Date() } }, { expiresAt: null }],
          },
        },
      },
    });

    const collection = comicIssue.collectibleComicCollection;
    const isSoldOut = collection && !activeCandyMachine;
    if (isSoldOut) {
      tags.push({
        title: CarouselTagTitle.Sold,
        type: CarouselTagType.Chip,
      });

      tags.push({
        title: CarouselTagTitle.Tensor,
        type: CarouselTagType.Button,
        href: `${TENSOR_TRADE_URL}/${collection.address}`,
      });
      return;
    }

    const coupons = activeCandyMachine.coupons;
    const defaultCoupon = coupons?.find(
      (coupon) =>
        coupon.type === CouponType.PublicUser ||
        coupon.type === CouponType.RegisteredUser,
    );

    const mintDate = defaultCoupon?.startsAt;
    if (mintDate) {
      const isUpcomingMint = mintDate > new Date();
      tags.push({
        title: isUpcomingMint
          ? CarouselTagTitle.UpcomingMint
          : CarouselTagTitle.Minting,
        type: CarouselTagType.Chip,
        timestamp: mintDate.toString(),
      });

      tags.push({
        title: CarouselTagTitle.Launchpad,
        type: CarouselTagType.Button,
      });
    }
  }
}
