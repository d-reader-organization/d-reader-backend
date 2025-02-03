import { MaxLength, IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { IsOptionalString } from 'src/decorators/IsOptionalString';
import { IsOptionalUrl } from 'src/decorators/IsOptionalUrl';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';

export class CreateCreatorChannelDto {
  @IsNotEmpty()
  @MaxLength(48)
  handle: string;

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
