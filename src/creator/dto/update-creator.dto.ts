import { Transform } from 'class-transformer';
import { IsEmail, MaxLength, IsString, IsOptional } from 'class-validator';
import { IsOptionalUrl } from 'src/decorators/IsOptionalUrl';

export class UpdateCreatorDto {
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase())
  email: string;

  // @IsNotEmpty()
  // @MaxLength(48)
  // name: string;

  // @Expose()
  // @IsKebabCase()
  // @Transform(({ obj }) => kebabCase(obj.name))
  // @ApiProperty({ readOnly: true, required: false })
  // slug: string;

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

  @IsOptionalUrl()
  twitter?: string;

  @IsOptionalUrl()
  instagram?: string;

  @IsOptionalUrl()
  lynkfire?: string;
}
