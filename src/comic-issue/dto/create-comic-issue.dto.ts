import { ApiProperty, IntersectionType, PickType } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { ArrayUnique, IsArray, isEmpty, IsOptional } from 'class-validator';
import { snakeCase } from 'lodash';
import { CreateComicPageDto } from 'src/comic-page/dto/create-comic-page.dto';
import { IsSnakeCase } from 'src/decorators/IsSnakeCase';
import { ComicIssueDto } from './comic-issue.dto';

export class CreateComicIssueDto extends PickType(ComicIssueDto, [
  'number',
  'title',
  'flavorText',
  'description',
  'magicEden',
  'openSea',
  'releaseDate',
  'comicId',
]) {
  @Expose()
  @IsSnakeCase()
  @Transform(({ obj }) => snakeCase(obj.title))
  @ApiProperty({ readOnly: true, required: false })
  slug: string;

  @IsArray()
  @Type(() => CreateComicPageDto)
  @ApiProperty({ type: [CreateComicPageDto] })
  pages: CreateComicPageDto[];

  // TODO v2: revise this later. Possibly it's a bug within swagger-ui
  // @Transform is necessary for ApiProperty to work properly for multipart/form-data with swagger
  @IsOptional()
  @ArrayUnique()
  @Type(() => String)
  @ApiProperty({ type: [String], default: [] })
  @Transform(({ value }: { value: string[] | string }) => {
    if (isEmpty(value)) return [];
    else if (typeof value === 'string') {
      return value.split(',');
    } else return value;
  })
  hashlist?: string[];
}

export class CreateComicIssueFilesDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  cover?: Express.Multer.File | null;

  @ApiProperty({ type: 'string', format: 'binary' })
  soundtrack?: Express.Multer.File | null;
}

export class CreateComicIssueSwaggerDto extends IntersectionType(
  CreateComicIssueDto,
  CreateComicIssueFilesDto,
) {}
