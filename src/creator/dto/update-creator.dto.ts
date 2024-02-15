import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, MaxLength, IsString, IsOptional } from 'class-validator';
import { IsOptionalString } from 'src/decorators/IsOptionalString';
import { IsOptionalUrl } from 'src/decorators/IsOptionalUrl';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';

export class UpdateCreatorDto {
  @IsEmail()
  @IsOptional()
  @Transform(({ value }) => value?.toLowerCase())
  email?: string;

  // @IsNotEmpty()
  // @MaxLength(48)
  // name: string;

  // @Expose()
  // @IsKebabCase()
  // @Transform(({ obj }) => kebabCase(obj.name))
  // @ApiProperty({ readOnly: true, required: false })
  // slug: string;

  @IsOptionalString()
  @IsSolanaAddress()
  tippingAddress?: string;

  @IsString()
  @IsOptional()
  @MaxLength(512)
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

export class UpdateCreatorFilesDto {
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
