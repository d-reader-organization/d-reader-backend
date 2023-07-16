import { plainToInstance } from 'class-transformer';
import { IsBoolean, IsPositive, IsString, IsNotEmpty } from 'class-validator';
import { getPresignedUrl } from 'src/aws/s3client';
import { ComicPage, ComicPageTranslation } from '@prisma/client';
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

export type TranslatedComicPage = ComicPage & ComicPageTranslation;
export async function toComicPageDto(page: TranslatedComicPage) {
  const plainPageDto: ComicPageDto = {
    id: page.id,
    pageNumber: page.pageNumber,
    isPreviewable: page.isPreviewable,
    image: await getPresignedUrl(page.image),
  };

  const pageDto = plainToInstance(ComicPageDto, plainPageDto);
  return pageDto;
}

export async function toComicPageDtoArray(
  pages: TranslatedComicPage[],
): Promise<ComicPageDto[]> {
  const comicPagesDto = await Promise.all(pages.map(toComicPageDto));
  return sortBy(comicPagesDto, 'pageNumber');
}
