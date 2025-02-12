import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  MaxLength,
  IsString,
  IsOptional,
  IsNotEmpty,
  MinLength,
} from 'class-validator';
import {
  DISPLAY_NAME_MAX_SIZE,
  DISPLAY_NAME_MIN_SIZE,
  USERNAME_MAX_SIZE,
  USERNAME_MIN_SIZE,
} from 'src/constants';
import { IsOptionalString } from 'src/decorators/IsOptionalString';
import { IsOptionalUrl } from 'src/decorators/IsOptionalUrl';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';

export class UpdateCreatorDto {
  @IsOptional()
  @IsNotEmpty()
  @MinLength(USERNAME_MIN_SIZE)
  @MaxLength(USERNAME_MAX_SIZE)
  handle?: string;

  @IsOptional()
  @MinLength(DISPLAY_NAME_MIN_SIZE)
  @MaxLength(DISPLAY_NAME_MAX_SIZE)
  displayName?: string;

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
  linktree?: string;
}

export class UpdateCreatorFilesDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  @IsOptional()
  banner?: Express.Multer.File | null;

  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  @IsOptional()
  avatar?: Express.Multer.File | null;
}
