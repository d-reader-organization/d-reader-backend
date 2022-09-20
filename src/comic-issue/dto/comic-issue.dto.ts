import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';
// import { ComicDto } from 'src/comic/dto/comic.dto';
import { ComicPageDto } from 'src/comic-page/entities/comic-page.dto';
import { IsSnakeCase } from 'src/decorators/IsSnakeCase';

@Exclude()
export class ComicIssueDto {
  @IsPositive()
  id: number;

  @Expose()
  @IsPositive()
  number: number;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @MaxLength(54)
  title: string;

  @Expose()
  @IsNotEmpty()
  @IsSnakeCase()
  slug: string;

  @Expose()
  @IsString()
  @MaxLength(256)
  @IsOptional()
  @ValidateIf((p) => p.description !== '')
  @ApiProperty({ required: false })
  description: string;

  @Expose()
  @IsString()
  @MaxLength(128)
  @IsOptional()
  @ValidateIf((p) => p.flavorText !== '')
  @ApiProperty({ required: false })
  flavorText: string;

  @Expose()
  @IsString()
  cover: string;

  @Expose()
  @IsString()
  soundtrack: string;

  @Expose()
  @IsUrl()
  @IsOptional()
  @ValidateIf((p) => p.magicEden !== '')
  @ApiProperty({ required: false })
  magicEden: string;

  @Expose()
  @IsUrl()
  @IsOptional()
  @ValidateIf((p) => p.openSea !== '')
  @ApiProperty({ required: false })
  openSea: string;

  @Expose()
  @Type(() => Date)
  releaseDate: Date;

  // @Expose()
  // @IsOptional()
  // @ApiProperty({ required: false })
  // @Type(() => Date)
  // publishedAt: Date | null;

  @Expose()
  @Transform(({ obj }) => !!obj.publishedAt)
  isPublished: boolean;

  // @Expose()
  // @IsOptional()
  // @ApiProperty({ required: false })
  // @Type(() => Date)
  // deletedAt: Date | null;

  @Expose()
  @Transform(({ obj }) => !!obj.deletedAt)
  isDeleted: boolean;

  // @Expose()
  // @IsOptional()
  // @ApiProperty({ required: false })
  // @Type(() => Date)
  // verifiedAt: Date | null;

  @Expose()
  @Transform(({ obj }) => !!obj.verifiedAt)
  isVerified: boolean;

  @Expose()
  @IsPositive()
  comicId: number;

  // @Expose()
  // @Type(() => ComicDto)
  // comic: ComicDto;

  @Expose()
  @IsArray()
  @Type(() => ComicPageDto)
  pages: ComicPageDto[];

  @Expose()
  @ArrayUnique()
  @IsString({ each: true })
  @Transform(({ obj }) => {
    return obj.nfts.map((nft) => nft.mint);
  })
  hashlist: string[];
}
