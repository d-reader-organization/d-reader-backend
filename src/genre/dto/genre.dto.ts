import { plainToInstance, Transform } from 'class-transformer';
import { IsHexColor, IsNumber, IsString } from 'class-validator';
import { getPublicUrl } from 'src/aws/s3client';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { Genre } from '@prisma/client';
import { PickType } from '@nestjs/swagger';

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

export class PartialGenreDto extends PickType(GenreDto, [
  'name',
  'slug',
  'color',
  'icon',
]) {}

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
