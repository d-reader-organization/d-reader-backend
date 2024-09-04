import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import {
  CreateCarouselSlideDto,
  CreateCarouselSlideBodyDto,
  CreateCarouselSlideFilesDto,
} from 'src/carousel/dto/create-carousel-slide.dto';
import { CarouselService } from './carousel.service';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import {
  CarouselSlideDto,
  toCarouselSlideDto,
  toCarouselSlideDtoArray,
} from './dto/carousel-slide.dto';
import { plainToInstance } from 'class-transformer';
import { ApiFile } from 'src/decorators/api-file.decorator';
import { AdminGuard } from 'src/guards/roles.guard';
import { UpdateCarouselSlideDto } from './dto/update-carousel-slide.dto';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CarouselSlideFilterParams } from './dto/carousel-slide-params.dto';
import { memoizeThrottle } from 'src/utils/lodash';

@UseGuards(ThrottlerGuard)
@ApiTags('Carousel')
@Controller('carousel')
export class CarouselController {
  constructor(private readonly carouselService: CarouselService) {}

  /* Create a new carousel slide */
  @AdminGuard()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateCarouselSlideDto })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'image', maxCount: 1 }]))
  @Post('slides/create')
  async create(
    @Body() createCarouselSlideDto: CreateCarouselSlideBodyDto,
    @UploadedFiles({
      transform: (val) => plainToInstance(CreateCarouselSlideFilesDto, val),
    })
    files: CreateCarouselSlideFilesDto,
  ): Promise<CarouselSlideDto> {
    const carouselSlide = await this.carouselService.create(
      createCarouselSlideDto,
      files,
    );
    return toCarouselSlideDto(carouselSlide);
  }

  private throttledFindAll = memoizeThrottle(
    async (isExpired?: boolean) => {
      const carouselSlides = await this.carouselService.findAll(isExpired);
      return toCarouselSlideDtoArray(carouselSlides);
    },
    15 * 60 * 1000, // 15 minutes
  );

  /* Get all carousel slides */
  @Get('slides/get')
  async findAll(@Query() params: CarouselSlideFilterParams) {
    return this.throttledFindAll(params.isExpired);
  }

  /* Get specific carousel slide by unique id */
  @Get('slides/get/:id')
  async findOne(@Param('id') id: string): Promise<CarouselSlideDto> {
    const carouselSlide = await this.carouselService.findOne(+id);
    return toCarouselSlideDto(carouselSlide);
  }

  /* Update specific carousel slide */
  @AdminGuard()
  @Patch('slides/update/:id')
  async update(
    @Param('id') id: string,
    @Body() updateCarouselSlideDto: UpdateCarouselSlideDto,
  ): Promise<CarouselSlideDto> {
    const updatedCarouselSlide = await this.carouselService.update(
      +id,
      updateCarouselSlideDto,
    );
    return toCarouselSlideDto(updatedCarouselSlide);
  }

  /* Update specific carousel slides image file */
  @AdminGuard()
  @ApiConsumes('multipart/form-data')
  @ApiFile('image')
  @UseInterceptors(FileInterceptor('image'))
  @Patch('slides/update/:id/image')
  async updateImage(
    @Param('id') id: string,
    @UploadedFile() image: Express.Multer.File,
  ): Promise<CarouselSlideDto> {
    const updatedCarouselSlide = await this.carouselService.updateFile(
      +id,
      image,
      'image',
    );
    return toCarouselSlideDto(updatedCarouselSlide);
  }

  /* Make carousel slide expire */
  @AdminGuard()
  @Patch('slides/expire/:id')
  async expire(@Param('id') id: string) {
    await this.carouselService.expire(+id);
  }
}
