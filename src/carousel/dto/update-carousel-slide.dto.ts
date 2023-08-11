import { PartialType } from '@nestjs/swagger';
import { CreateCarouselSlideBodyDto } from './create-carousel-slide.dto';

export class UpdateCarouselSlideDto extends PartialType(
  CreateCarouselSlideBodyDto,
) {}
