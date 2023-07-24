import { plainToInstance, Transform } from 'class-transformer';
import { IsHexColor, IsNumber, IsString } from 'class-validator';
import { getPublicUrl } from 'src/aws/s3client';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { Genre } from '@prisma/client';

export class GenreDto {
  @IsString()
  name: string;

  @IsKebabCase()
  slug: string;

  @IsString()
  icon: string;

  @IsHexColor()
  color: string;

  @IsNumber()
  priority: number;

  @Transform(({ obj }) => !!obj.deletedAt)
  isDeleted: boolean;
}

export function toGenreDto(genre: Genre) {
  const plainGenreDto: GenreDto = {
    name: genre.name,
    slug: genre.slug,
    icon: getPublicUrl(genre.icon),
    color: genre.color,
    priority: genre.priority,
    isDeleted: !!genre.deletedAt,
  };

  const genreDto = plainToInstance(GenreDto, plainGenreDto);
  return genreDto;
}

export const toGenreDtoArray = (genres: Genre[]) => {
  return genres.map(toGenreDto);
};

export function toPartialGenreDtoArray(genres?: Genre[]) {
  if (!genres) return genres;
  const filteredSortedGenres = genres.reduce<Genre[]>((acc, genre) => {
    if (!genre.deletedAt) {
      const insertIndex = acc.findIndex(
        (existingGenre) => existingGenre.priority > genre.priority,
      );

      if (insertIndex === -1) {
        return [...acc, genre];
      } else [...acc.slice(0, insertIndex), genre, ...acc.slice(insertIndex)];
    }
    return acc;
  }, []);

  const partialGenres = filteredSortedGenres.map((genre) => {
    return {
      name: genre.name,
      slug: genre.slug,
      color: genre.color,
      icon: getPublicUrl(genre.icon),
    };
  });

  return partialGenres;
}
