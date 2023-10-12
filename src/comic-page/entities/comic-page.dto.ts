import { plainToInstance } from 'class-transformer';
import { IsBoolean, IsPositive, IsString, IsNotEmpty } from 'class-validator';
import { getPublicUrl } from 'src/aws/s3client';
import { ComicPage } from '@prisma/client';
import { sortBy } from 'lodash';

export class ComicPageDto {
  @IsPositive()
  id: number;

  @IsPositive()
  pageNumber: number;

  @IsBoolean()
  isPreviewable: boolean;

  @IsString()
  @IsNotEmpty()
  image: string;
}

export function toComicPageDto(page: ComicPage) {
  const plainPageDto: ComicPageDto = {
    id: page.id,
    pageNumber: page.pageNumber,
    isPreviewable: page.isPreviewable,
    // image: await getPresignedUrl(page.image),
    image: getPublicUrl(page.image),
  };

  const pageDto = plainToInstance(ComicPageDto, plainPageDto);
  return pageDto;
}

export function toComicPageDtoArray(pages: ComicPage[]): ComicPageDto[] {
  const comicPagesDto = pages.map(toComicPageDto);
  return sortBy(comicPagesDto, 'pageNumber');
}
