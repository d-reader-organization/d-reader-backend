import { ApiProperty, PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateComicPageDto } from 'src/comic-page/dto/create-comic-page.dto';
import { Comic } from '../entities/comic.entity';

export class CreateComicDto extends PickType(Comic, [
  'title',
  'flavorText',
  'description',
  'issueNumber',
  'releaseDate',
  'collectionName',
]) {
  @ApiProperty({ type: 'string', format: 'binary', required: true })
  cover: Express.Multer.File;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  soundtrack: Express.Multer.File | null;

  @IsArray()
  @Type(() => CreateComicPageDto)
  @ApiProperty({ type: [CreateComicPageDto] })
  @ValidateNested({ each: true })
  pages: CreateComicPageDto[];
}

export class CreateComicFilesDto {
  @ApiProperty({ type: 'string', format: 'binary', required: true })
  cover: Express.Multer.File;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  soundtrack: Express.Multer.File | null;
}
