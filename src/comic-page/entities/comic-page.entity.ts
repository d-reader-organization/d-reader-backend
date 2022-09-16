import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsPositive,
  IsOptional,
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { Comic } from 'src/comic/entities/comic.entity';

export class ComicPage {
  @IsPositive()
  id: number;

  @IsPositive()
  pageNumber: number;

  @IsPositive()
  chapterNumber: number;

  @IsBoolean()
  isPreviewable: boolean;

  @IsString()
  @IsNotEmpty()
  image: string;

  @IsString()
  @IsOptional()
  altImage: string | null;

  @IsPositive()
  comicId: number;

  @IsOptional()
  @Type(() => Comic)
  comic: Comic;
}
