import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { kebabCase } from 'lodash';
import { IsKebabCase } from 'src/decorators/IsKebabCase';

export class CreateGenreDto {
  @Expose()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name: string;

  @Expose()
  @IsKebabCase()
  @Transform(({ obj }) => kebabCase(obj.name))
  @ApiProperty({ readOnly: true, required: false })
  slug: string;
}

export class CreateGenreFilesDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  @IsOptional()
  image?: Express.Multer.File | null;
}

export class CreateGenreSwaggerDto extends IntersectionType(
  CreateGenreDto,
  CreateGenreFilesDto,
) {}
