import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { ApiProperty } from '@nestjs/swagger';

export enum DigitalAssetType {
  CollectibleComic = 'CollectibleComic',
  PrintEdition = 'PrintEdition',
  OneOfOne = 'OneOfOne',
}

export class BaseDigitalAssetDto {
  @IsSolanaAddress()
  address: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  collectionAddress?: string;

  @IsUrl()
  image: string;

  @IsSolanaAddress()
  ownerAddress: string;

  @IsNumber()
  royalties: number;

  @IsBoolean()
  isNSFW?: boolean;

  @ApiProperty({ enum: DigitalAssetType })
  @IsEnum(DigitalAssetType)
  type: DigitalAssetType;
}
