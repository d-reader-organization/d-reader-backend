import { plainToInstance } from 'class-transformer';
import { IsBoolean, IsPositive, IsString, IsNotEmpty } from 'class-validator';
import { getReadUrl } from 'src/aws/s3client';
import { ComicPage } from '@prisma/client';

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

export const toComicPageDtoArray = (pages: ComicPage[]) => {
  return Promise.all(pages.map(toComicPageDto));
};
