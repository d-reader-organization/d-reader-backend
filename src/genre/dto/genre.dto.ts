import { plainToInstance, Transform } from 'class-transformer';
import { IsHexColor, IsNumber, IsString } from 'class-validator';
import { getCachedReadUrl } from 'src/aws/s3client';
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

export async function toGenreDto(genre: Genre) {
  const plainGenreDto: GenreDto = {
    name: genre.name,
    slug: genre.slug,
    icon: await getCachedReadUrl(genre.icon),
    color: genre.color,
    priority: genre.priority,
    isDeleted: !!genre.deletedAt,
  };

  const genreDto = plainToInstance(GenreDto, plainGenreDto);
  return genreDto;
}

export const toGenreDtoArray = (genres: Genre[]) => {
  return Promise.all(genres.map(toGenreDto));
};
