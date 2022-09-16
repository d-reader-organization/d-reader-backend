import { Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { snakeCase } from 'lodash';
import { Comic } from 'src/comic/entities/comic.entity';
import { IsSnakeCase } from 'src/decorators/IsSnakeCase';
import { NFT } from './nft.entity';

export class Collection {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsSnakeCase()
  @Transform(({ obj }) => snakeCase(obj.name))
  slug: string;

  @Type(() => Date)
  verifiedAt: Date;

  @Transform(({ obj }) => !!obj.verifiedAt)
  isVerified: boolean;

  @IsString()
  thumbnail: string;

  @IsString()
  pfp: string;

  @IsString()
  @IsOptional()
  logo: string | null;

  @IsString()
  @MaxLength(256)
  description: string;

  @IsUrl()
  @IsOptional()
  website: string;

  @IsUrl()
  @IsOptional()
  twitter: string;

  @IsUrl()
  @IsOptional()
  discord: string;

  @IsUrl()
  @IsOptional()
  telegram: string;

  @IsUrl()
  @IsOptional()
  instagram: string;

  @IsUrl()
  @IsOptional()
  medium: string;

  @IsUrl()
  @IsOptional()
  tikTok: string;

  @IsUrl()
  @IsOptional()
  youTube: string;

  @IsUrl()
  @IsOptional()
  magicEden: string;

  @IsUrl()
  @IsOptional()
  openSea: string;

  @Type(() => NFT)
  nfts: NFT;

  @Type(() => Comic)
  comics: Comic;
}
