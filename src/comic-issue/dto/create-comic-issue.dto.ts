import { ApiProperty, IntersectionType, PickType } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { ArrayUnique, IsArray, isEmpty, IsOptional } from 'class-validator';
import { kebabCase } from 'lodash';
import { CreateComicPageDto } from 'src/comic-page/dto/create-comic-page.dto';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
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
  @IsKebabCase()
  @Transform(({ obj }) => kebabCase(obj.title))
  @ApiProperty({ readOnly: true, required: false })
  slug: string;

  @Expose()
  @IsArray()
  // TODO v2: this shouldn't be here but swagger-ui is weird when multipart/form-data
  @IsOptional()
  @Type(() => CreateComicPageDto)
  @ApiProperty({ type: [CreateComicPageDto] })
  // TODO!: revise this
  pages: CreateComicPageDto[] = [];

  // TODO v2: revise this later. Possibly it's a bug within swagger-ui
  // @Transform is necessary for ApiProperty to work properly for multipart/form-data with swagger
  @Expose()
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
  // TODO!: @Expose() might be unnecessary here
  @Expose()
  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  cover?: Express.Multer.File | null;

  @Expose()
  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  soundtrack?: Express.Multer.File | null;
}

export class CreateComicIssueSwaggerDto extends IntersectionType(
  CreateComicIssueDto,
  CreateComicIssueFilesDto,
) {}
