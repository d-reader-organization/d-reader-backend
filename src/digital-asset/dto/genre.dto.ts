import { DigitalAssetGenre } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { IsString } from 'class-validator';

export class DigitalAssetGenreDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;
}

export function toDigitalAssetGenreDto(genre: DigitalAssetGenre) {
  const plainDigitalAssetGenreDto: DigitalAssetGenreDto = {
    name: genre.name,
    slug: genre.slug,
  };

  const digitalAssetGenreDto = plainToInstance(
    DigitalAssetGenreDto,
    plainDigitalAssetGenreDto,
  );
  return digitalAssetGenreDto;
}

export function toDigitalAssetGenreDtoArray(genres: DigitalAssetGenre[]) {
  return genres.map((genre) => toDigitalAssetGenreDto(genre));
}
