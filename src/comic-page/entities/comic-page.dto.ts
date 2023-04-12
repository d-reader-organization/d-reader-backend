import { plainToInstance } from 'class-transformer';
import { IsBoolean, IsPositive, IsString, IsNotEmpty } from 'class-validator';
import { getReadUrl } from '../../aws/s3client';
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

export async function toComicPageDto(page: ComicPage) {
  const plainPageDto: ComicPageDto = {
    id: page.id,
    pageNumber: page.pageNumber,
    isPreviewable: page.isPreviewable,
    image: await getReadUrl(page.image),
  };

  const pageDto = plainToInstance(ComicPageDto, plainPageDto);
  return pageDto;
}

export async function toComicPageDtoArray(
  pages: ComicPage[],
): Promise<ComicPageDto[]> {
  const comicPagesDto = await Promise.all(pages.map(toComicPageDto));
  return sortBy(comicPagesDto, 'pageNumber');
}
