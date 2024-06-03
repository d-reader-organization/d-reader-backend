import { plainToInstance } from 'class-transformer';
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
}

export function toGenreDto(genre: Genre) {
  const plainGenreDto: GenreDto = {
    name: genre.name,
    slug: genre.slug,
    icon: getPublicUrl(genre.icon),
    color: genre.color,
    priority: genre.priority,
  };

  const genreDto = plainToInstance(GenreDto, plainGenreDto);
  return genreDto;
}

export const toGenreDtoArray = (genres: Genre[]) => {
  return genres.map(toGenreDto);
};
