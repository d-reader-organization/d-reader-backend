import { Module } from '@nestjs/common';
import { CarouselController } from './carousel.controller';
import { CarouselService } from './carousel.service';

@Module({
  controllers: [CarouselController],
  providers: [CarouselService],
})
export class CarouselModule {}
