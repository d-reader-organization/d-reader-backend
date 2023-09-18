import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import {
  IsHexColor,
  IsNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { kebabCase } from 'lodash';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { TransformStringToNumber } from 'src/utils/transform';

export class CreateGenreBodyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name: string;

  @Expose()
  @IsKebabCase()
  @Transform(({ obj }) => kebabCase(obj.name))
  @ApiProperty({ readOnly: true, required: false })
  slug: string;

  @IsHexColor()
  color: string;

  @IsNumber()
  @TransformStringToNumber()
  priority: number;
}

export class CreateGenreFilesDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  icon?: Express.Multer.File | null;
}

export class CreateGenreDto extends IntersectionType(
  CreateGenreBodyDto,
  CreateGenreFilesDto,
) {}
