import { PickType } from '@nestjs/swagger';
import { Genre } from '@prisma/client';
import { getPublicUrl } from 'src/aws/s3client';
import { GenreDto } from './genre.dto';
import { plainToInstance } from 'class-transformer';
import { sortBy } from 'lodash';

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
  const sortedGenres = sortBy(genres, 'priority');
  return sortedGenres.map(toPartialGenreDto);
}
