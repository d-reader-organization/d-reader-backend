import { Module } from '@nestjs/common';
import { ComicService } from './comic.service';
import { ComicController } from './comic.controller';
import { ComicPageService } from 'src/comic-page/comic-page.service';

@Module({
  controllers: [ComicController],
  providers: [ComicService, ComicPageService],
})
export class ComicModule {}
