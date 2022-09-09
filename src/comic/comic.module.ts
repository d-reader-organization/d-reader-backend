import { Module } from '@nestjs/common';
import { ComicService } from './comic.service';
import { ComicController } from './comic.controller';

@Module({
  controllers: [ComicController],
  providers: [ComicService],
})
export class ComicModule {}
