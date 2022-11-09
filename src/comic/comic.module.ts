import { Module } from '@nestjs/common';
import { ComicService } from './comic.service';
import { ComicController } from './comic.controller';
import { WalletComicService } from './wallet-comic.service';

@Module({
  controllers: [ComicController],
  providers: [ComicService, WalletComicService],
})
export class ComicModule {}
