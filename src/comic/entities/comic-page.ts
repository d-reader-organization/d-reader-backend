import { IsBoolean, IsPositive, IsOptional, IsUrl } from 'class-validator';

export class ComicPage {
  @IsPositive()
  id: number;

  @IsBoolean()
  isPreviewable: boolean;

  @IsUrl()
  image: string;

  @IsUrl()
  @IsOptional()
  altImage: string | null;

  @IsPositive()
  comicId: number;
}
