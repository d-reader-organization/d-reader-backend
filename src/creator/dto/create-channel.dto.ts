import {
  MaxLength,
  IsString,
  IsOptional,
  IsNotEmpty,
  MinLength,
} from 'class-validator';
import { DISPLAY_NAME_MAX_SIZE, DISPLAY_NAME_MIN_SIZE } from 'src/constants';
import { IsOptionalString } from 'src/decorators/IsOptionalString';
import { IsOptionalUrl } from 'src/decorators/IsOptionalUrl';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';

export class CreateCreatorChannelDto {
  @IsNotEmpty()
  @MinLength(DISPLAY_NAME_MIN_SIZE)
  @MaxLength(DISPLAY_NAME_MAX_SIZE)
  displayName: string;

  @IsOptionalString()
  @IsSolanaAddress()
  tippingAddress?: string;

  @IsString()
  @IsOptional()
  @MaxLength(512)
  description?: string;

  @IsOptionalUrl()
  website?: string;

  @IsOptionalUrl()
  twitter?: string;

  @IsOptionalUrl()
  instagram?: string;

  @IsOptionalUrl()
  linktree?: string;
}
