import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { getReadUrl } from 'src/aws/s3client';
import { ComicPageDto } from 'src/comic-page/entities/comic-page.dto';
import { IsKebabCase } from 'src/decorators/IsKebabCase';

@Exclude()
export class ComicIssueDto {
  @IsPositive()
  id: number;

  @Expose()
  @IsPositive()
  @Transform(({ value }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  number: number;

  @Expose()
  @IsNotEmpty()
  @MaxLength(54)
  title: string;

  @Expose()
  @IsNotEmpty()
  @IsKebabCase()
  slug: string;

  @Expose()
  @MaxLength(256)
  @IsOptional()
  @ValidateIf((p) => p.description !== '')
  @ApiProperty({ required: false })
  description: string;

  @Expose()
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
  @IsDateString()
  @Transform(({ value }) => new Date(value).toISOString())
  releaseDate: string;

  @Expose()
  @Transform(({ obj }) => !!obj.publishedAt)
  isPublished: boolean;

  @Expose()
  @Transform(({ obj }) => !!obj.deletedAt)
  isDeleted: boolean;

  @Expose()
  @Transform(({ obj }) => !!obj.verifiedAt)
  isVerified: boolean;

  @Expose()
  @IsPositive()
  @Transform(({ value }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
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
  @Type(() => String)
  @Transform(({ obj }) => obj.nfts.map((nft) => nft.mint))
  hashlist: string[];

  // presignUrls = async () => {
  //   // Serial
  //   // this.cover = await getReadUrl(this.cover);
  //   // this.soundtrack = await getReadUrl(this.soundtrack);

  //   // Parallel
  //   await Promise.all([
  //     async () => (this.cover = await getReadUrl(this.cover)),
  //     async () => (this.soundtrack = await getReadUrl(this.soundtrack)),
  //   ]);

  //   return this;
  // };

  static async presignUrls(input: ComicIssueDto): Promise<ComicIssueDto>;
  static async presignUrls(input: ComicIssueDto[]): Promise<ComicIssueDto[]>;
  static async presignUrls(
    input: ComicIssueDto | ComicIssueDto[],
  ): Promise<ComicIssueDto | ComicIssueDto[]> {
    if (Array.isArray(input)) {
      input = await Promise.all(
        input.map(async (obj) => {
          await Promise.all([
            async () => (obj.cover = await getReadUrl(obj.cover)),
            async () => (obj.soundtrack = await getReadUrl(obj.soundtrack)),
          ]);
          return obj;
        }),
      );
      return input;
    } else {
      input.cover = await getReadUrl(input.cover);
      input.soundtrack = await getReadUrl(input.soundtrack);
      return input;
    }
  }
}
