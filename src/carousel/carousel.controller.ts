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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { RestAuthGuard } from 'src/guards/rest-auth.guard';
import {
  CreateCarouselSlideSwaggerDto,
  CreateCarouselSlideDto,
  CreateCarouselSlideFilesDto,
} from 'src/carousel/dto/create-carousel-slide.dto';
import { CarouselService } from './carousel.service';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { CarouselSlideDto } from './dto/carousel-slide.dto';
import { plainToInstance } from 'class-transformer';
import { ApiFile } from 'src/decorators/api-file.decorator';
import { Roles, RolesGuard } from 'src/guards/roles.guard';
import { Role } from '@prisma/client';
import { UpdateCarouselSlideDto } from './dto/update-carousel-slide.dto';

@UseGuards(RestAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Carousel')
@Controller('carousel')
export class CarouselController {
  constructor(private readonly carouselService: CarouselService) {}

  /* Create a new carousel slide */
  @Roles(Role.Superadmin)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateCarouselSlideSwaggerDto })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'image', maxCount: 1 }]))
  @Post('slides/create')
  async create(
    @Body() createCarouselSlideDto: CreateCarouselSlideDto,
    @UploadedFiles({
      transform: (val) => plainToInstance(CreateCarouselSlideFilesDto, val),
    })
    files: CreateCarouselSlideFilesDto,
  ): Promise<CarouselSlideDto> {
    const carouselSlide = await this.carouselService.create(
      createCarouselSlideDto,
      files,
    );
    const carouselSlideDto = plainToInstance(CarouselSlideDto, carouselSlide);
    return CarouselSlideDto.presignUrls(carouselSlideDto);
  }

  /* Get all carousel slides */
  @Get('slides/get')
  async findAll(): Promise<CarouselSlideDto[]> {
    const carouselSlides = await this.carouselService.findAll();
    const carouselSlidesDto = plainToInstance(CarouselSlideDto, carouselSlides);
    return CarouselSlideDto.presignUrls(carouselSlidesDto);
  }

  /* Get specific carousel slide by unique id */
  @Get('slides/get/:id')
  async findOne(@Param('id') id: string): Promise<CarouselSlideDto> {
    const carouselSlide = await this.carouselService.findOne(+id);
    const carouselSlideDto = plainToInstance(CarouselSlideDto, carouselSlide);
    return CarouselSlideDto.presignUrls(carouselSlideDto);
  }

  /* Update specific carousel slide */
  @Roles(Role.Superadmin)
  @Patch('slides/update/:id')
  async update(
    @Param('id') id: string,
    @Body() updateCarouselSlideDto: UpdateCarouselSlideDto,
  ): Promise<CarouselSlideDto> {
    const updatedCarouselSlide = await this.carouselService.update(
      +id,
      updateCarouselSlideDto,
    );
    const carouselSlideDto = plainToInstance(
      CarouselSlideDto,
      updatedCarouselSlide,
    );
    return CarouselSlideDto.presignUrls(carouselSlideDto);
  }

  /* Update specific carousel slides image file */
  @Roles(Role.Superadmin)
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
    );
    const comicDto = plainToInstance(CarouselSlideDto, updatedCarouselSlide);
    return CarouselSlideDto.presignUrls(comicDto);
  }

  /* Make carousel slide expire */
  @Roles(Role.Superadmin)
  @Patch('slides/expire/:id')
  async expire(@Param('id') id: string): Promise<CarouselSlideDto> {
    const expiredCarouselSlide = await this.carouselService.expire(+id);
    const carouselSlideDto = plainToInstance(
      CarouselSlideDto,
      expiredCarouselSlide,
    );
    return CarouselSlideDto.presignUrls(carouselSlideDto);
  }
}
