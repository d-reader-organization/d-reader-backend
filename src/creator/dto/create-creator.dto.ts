import { ApiProperty, IntersectionType, PickType } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';
import { kebabCase } from 'lodash';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { CreatorDto } from './creator.dto';

@Exclude()
export class CreateCreatorDto extends PickType(CreatorDto, [
  'name',
  'email',
  'description',
  'flavorText',
  'website',
]) {
  @Expose()
  @IsKebabCase()
  @Transform(({ obj }) => kebabCase(obj.name))
  @ApiProperty({ readOnly: true, required: false })
  slug: string;

  // @Expose()
  // @MinLength(8)
  // @MaxLength(54)
  // password: string;
}

export class CreateCreatorFilesDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  @IsOptional()
  thumbnail?: Express.Multer.File | null;

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
