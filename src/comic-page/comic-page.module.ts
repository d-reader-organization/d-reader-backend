import { Module } from '@nestjs/common';
import { ComicPageService } from './comic-page.service';

@Module({
  providers: [ComicPageService],
})
export class ComicPageModule {}
