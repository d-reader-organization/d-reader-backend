import { Exclude, Expose, Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { getReadUrl } from 'src/aws/s3client';
import { ComicPageDto } from 'src/comic-page/entities/comic-page.dto';
import { IsEmptyOrUrl } from 'src/decorators/IsEmptyOrUrl';
import { IsKebabCase } from 'src/decorators/IsKebabCase';

@Exclude()
export class ComicIssueDto {
  @IsPositive()
  id: number;

  @Expose()
  @IsPositive()
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
  @IsString()
  description: string;

  @Expose()
  @IsString()
  flavorText: string;

  @Expose()
  @IsString()
  cover: string;

  @Expose()
  @IsString()
  soundtrack: string;

  @Expose()
  @IsEmptyOrUrl()
  magicEden: string;

  @Expose()
  @IsEmptyOrUrl()
  openSea: string;

  @Expose()
  @IsDateString()
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
