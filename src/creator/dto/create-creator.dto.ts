import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { kebabCase } from 'lodash';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { IsOptionalUrl } from 'src/decorators/IsOptionalUrl';

export class CreateCreatorDto {
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase())
  email: string;

  @IsNotEmpty()
  @MaxLength(54)
  name: string;

  @Expose()
  @IsKebabCase()
  @Transform(({ obj }) => kebabCase(obj.name))
  @ApiProperty({ readOnly: true, required: false })
  slug: string;

  @IsString()
  @IsOptional()
  @MaxLength(256)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  flavorText?: string;

  @IsOptionalUrl()
  website?: string;

  // @MinLength(8)
  // @MaxLength(54)
  // password: string;
}

export class CreateCreatorFilesDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  @IsOptional()
  avatar?: Express.Multer.File | null;

  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  @IsOptional()
  banner?: Express.Multer.File | null;

  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  @IsOptional()
  logo?: Express.Multer.File | null;
}

export class CreateCreatorSwaggerDto extends IntersectionType(
  CreateCreatorDto,
  CreateCreatorFilesDto,
) {}
