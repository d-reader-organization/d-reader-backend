import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { Collection } from 'src/collection/entities/collection.entity';
import { ComicPage } from 'src/comic-page/entities/comic-page.entity';

export class Comic {
  @IsPositive()
  id: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  title: string;

  @IsString()
  @MaxLength(128)
  flavorText: string;

  @IsString()
  @MaxLength(256)
  description: string;

  @IsString()
  cover: string;

  @IsPositive()
  issueNumber: number;

  @Type(() => Date)
  releaseDate: Date;

  @IsString()
  @IsNotEmpty()
  collectionName: string;

  @IsString()
  @IsOptional()
  soundtrack: string | null;

  @IsOptional()
  @Type(() => Collection)
  collection: Collection | null;

  @IsArray()
  @Type(() => ComicPage)
  pages: ComicPage[];
}
