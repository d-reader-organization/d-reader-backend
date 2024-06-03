import { PickType } from '@nestjs/swagger';
import { ComicDto } from './comic.dto';
import { Comic } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

export class PartialComicDto extends PickType(ComicDto, [
  'title',
  'slug',
  'audienceType',
]) {}

export function toPartialComicDto(comic: Comic) {
  const plainComicDto: PartialComicDto = {
    title: comic.title,
    slug: comic.slug,
    audienceType: comic.audienceType,
  };

  const comicDto = plainToInstance(PartialComicDto, plainComicDto);
  return comicDto;
}

export const toPartialComicDtoArray = (comics: Comic[]) => {
  return comics.map(toPartialComicDto);
};
