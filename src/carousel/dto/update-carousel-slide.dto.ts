import { PartialType } from '@nestjs/swagger';
import { CreateCarouselSlideDto } from './create-carousel-slide.dto';

export class UpdateCarouselSlideDto extends PartialType(
  CreateCarouselSlideDto,
) {}
