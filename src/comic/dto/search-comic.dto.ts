import { plainToInstance } from 'class-transformer';
import { IsPositive, IsString, IsUrl } from 'class-validator';
import { IsKebabCase } from '../../decorators/IsKebabCase';
import { getPublicUrl } from '../../aws/s3client';
import { SearchComic } from './types';

export class SearchComicDto {
  @IsString()
  title: string;

  @IsKebabCase()
  slug: string;

  @IsUrl()
  cover: string;

  @IsPositive()
  issuesCount: number;
}

export function toSearchComicDto(comic: SearchComic) {
  const plainComicDto: SearchComicDto = {
    title: comic.title,
    slug: comic.slug,
    cover: getPublicUrl(comic.cover),
    issuesCount: comic.issuesCount,
  };

  const comicDto = plainToInstance(SearchComicDto, plainComicDto);
  return comicDto;
}

export const toSearchComicDtoArray = (comics: SearchComic[]) => {
  return comics.map(toSearchComicDto);
};
