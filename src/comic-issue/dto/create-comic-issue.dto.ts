import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  MaxLength,
} from 'class-validator';
import { kebabCase } from 'lodash';
import { CreateComicPageDto } from 'src/comic-page/dto/create-comic-page.dto';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { IsOptionalUrl } from 'src/decorators/IsOptionalUrl';

export class CreateComicIssueDto {
  @Expose()
  @IsNotEmpty()
  @MaxLength(54)
  title: string;

  @Expose()
  @IsKebabCase()
  @Transform(({ obj }) => kebabCase(obj.title))
  @ApiProperty({ readOnly: true, required: false })
  slug: string;

  @Expose()
  @IsPositive()
  @Transform(({ value }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  number: number;

  @Expose()
  @MaxLength(256)
  description?: string;

  @Expose()
  @MaxLength(128)
  flavorText?: string;

  @Expose()
  @IsOptionalUrl()
  magicEden: string;

  @Expose()
  @IsOptionalUrl()
  openSea: string;

  @Expose()
  @IsDateString()
  @Transform(({ value }) => new Date(value).toISOString())
  releaseDate: string;

  @Expose()
  @IsPositive()
  @Transform(({ value }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  comicId: number;

  @Expose()
  @IsArray()
  @Type(() => CreateComicPageDto)
  @ApiProperty({ type: [CreateComicPageDto] })
  pages: CreateComicPageDto[];

  // TODO v2: revise this later. Possibly it's a bug within swagger-ui
  // @Transform is necessary for ApiProperty to work properly
  // for multipart/form-data with swagger
  @Expose()
  @ArrayUnique()
  @Type(() => String)
  @ApiProperty({ type: [String] })
  @Transform(({ value }: { value: string[] | string }) => {
    if (typeof value === 'string') {
      return value.split(',');
    } else return value;
  })
  hashlist: string[];
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
