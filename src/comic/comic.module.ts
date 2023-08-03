import { Module } from '@nestjs/common';
import { ComicService } from './comic.service';
import { ComicController } from './comic.controller';
import { UserComicService } from './user-comic.service';

@Module({
  controllers: [ComicController],
  providers: [ComicService, UserComicService],
})
export class ComicModule {}
