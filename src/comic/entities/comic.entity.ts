import {
  IsDateString,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
} from 'class-validator';
import { Collection } from './collection.entity';
import { ComicPage } from './comic-page';

export class Comic {
  @IsPositive()
  id: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  flavorText: string | null;

  @IsString()
  @IsOptional()
  description: string | null;

  @IsUrl()
  thumbnail: string;

  @IsPositive()
  issueNumber: number;

  @IsDateString()
  releaseDate: string;

  @IsString()
  @IsNotEmpty()
  collectionName: string;

  @IsUrl()
  @IsOptional()
  soundtrack: string | null;

  // TODO: complete this
  @IsObject()
  collection: Collection;

  pages: ComicPage[];
}
