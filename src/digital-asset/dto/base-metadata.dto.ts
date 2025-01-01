import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { RoyaltyWalletDto } from '../../comic-issue/dto/royalty-wallet.dto';
import { MAX_CREATOR_LIMIT } from '../../constants';
import { TransformStringToNumber } from '../../utils/transform';
import { AttributeDto } from './attribute.dto';

export class BaseMetadataDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsString()
  authority: string;

  @IsOptional()
  @TransformStringToNumber()
  @IsNumber()
  sellerFeeBasisPoints: number;

  @IsArray()
  @Type(() => String)
  @ApiProperty({ type: [String] })
  genres: string[];

  @IsArray()
  @ApiProperty({ type: String })
  @Type(() => String)
  tags: string[];

  @Transform(({ value }: { value: string[] }) => {
    const attributesDtoArray = value.map((item) => JSON.parse(item));
    return attributesDtoArray;
  })
  @IsArray()
  @ApiProperty({ type: AttributeDto })
  @Type(() => AttributeDto)
  attributes: AttributeDto[];

  @Transform(({ value }: { value: string[] }) => {
    const royaltyWalletDtoArray = value.map((item) => JSON.parse(item));
    return royaltyWalletDtoArray;
  })
  @IsArray()
  @ArrayMaxSize(MAX_CREATOR_LIMIT)
  @Type(() => RoyaltyWalletDto)
  @ApiProperty({ type: [RoyaltyWalletDto] })
  royaltyWallets: RoyaltyWalletDto[];
}

export class BaseMetadataFilesDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  image: Express.Multer.File | null;
}
