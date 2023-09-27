import { PickType } from '@nestjs/swagger';
import { Genre } from '@prisma/client';
import { getPublicUrl } from 'src/aws/s3client';
import { GenreDto } from './genre.dto';
import { plainToInstance } from 'class-transformer';

export class PartialGenreDto extends PickType(GenreDto, [
  'name',
  'slug',
  'color',
  'icon',
]) {}

export function toPartialGenreDto(genre: Genre) {
  const plainGenreDto: PartialGenreDto = {
    name: genre.name,
    slug: genre.slug,
    color: genre.color,
    icon: getPublicUrl(genre.icon),
  };

  const genreDto = plainToInstance(PartialGenreDto, plainGenreDto);
  return genreDto;
}

export function toPartialGenreDtoArray(genres: Genre[]) {
  // TODO v2: replace reduce with sort here
  const filteredSortedGenres = genres.reduce<Genre[]>((acc, genre) => {
    const insertIndex = acc.findIndex(
      (existingGenre) => existingGenre.priority > genre.priority,
    );

    if (insertIndex === -1) {
      return [...acc, genre];
    } else [...acc.slice(0, insertIndex), genre, ...acc.slice(insertIndex)];
    return acc;
  }, []);

  return filteredSortedGenres.map(toPartialGenreDto);
}
