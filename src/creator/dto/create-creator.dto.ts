import { ApiProperty, IntersectionType, PickType } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { snakeCase } from 'lodash';
import { IsSnakeCase } from 'src/decorators/IsSnakeCase';
import { CreatorDto } from './creator.dto';

@Exclude()
export class CreateCreatorDto extends PickType(CreatorDto, [
  'name',
  'email',
  'description',
  'flavorText',
  'website',
]) {
  @IsSnakeCase()
  @Transform(({ obj }) => snakeCase(obj.name))
  @ApiProperty({ readOnly: true, required: false })
  slug: string;

  @IsString()
  @MinLength(8)
  @MaxLength(54)
  password: string;
}

export class CreateCreatorFilesDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  @IsOptional()
  thumbnail?: Express.Multer.File | null;

  @ApiProperty({ type: 'string', format: 'binary' })
  @IsOptional()
  avatar?: Express.Multer.File | null;

  @ApiProperty({ type: 'string', format: 'binary' })
  @IsOptional()
  banner?: Express.Multer.File | null;

  @ApiProperty({ type: 'string', format: 'binary' })
  @IsOptional()
  logo?: Express.Multer.File | null;
}

export class CreateCreatorSwaggerDto extends IntersectionType(
  CreateCreatorDto,
  CreateCreatorFilesDto,
) {}
