import { Module } from '@nestjs/common';
import { GenreService } from './genre.service';

@Module({
  providers: [GenreService],
})
export class GenreModule {}
