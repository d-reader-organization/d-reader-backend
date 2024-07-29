import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { AttributesDto } from '../../auction-house/dto/listing.dto';
import { RoyaltyWalletDto } from '../../comic-issue/dto/royalty-wallet.dto';
import { MAX_CREATOR_LIMIT } from '../../constants';
import { PartialGenreDto } from '../../genre/dto/partial-genre.dto';

export class BaseMetadataDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsString()
  authority: string;

  @IsOptional()
  @IsNumber()
  sellerFeeBasisPoints?: number;

  @IsArray()
  @Type(() => PartialGenreDto)
  genres?: PartialGenreDto[];

  @IsArray()
  @ApiProperty({ type: String })
  @Type(() => String)
  tags: string[];

  @IsArray()
  @ApiProperty({ type: AttributesDto })
  @Type(() => AttributesDto)
  attributes: AttributesDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_CREATOR_LIMIT)
  @Type(() => RoyaltyWalletDto)
  @ApiProperty({ type: [RoyaltyWalletDto] })
  royaltyWallets?: RoyaltyWalletDto[];
}

export class BaseMetadataFilesDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  image?: Express.Multer.File | null;
}
