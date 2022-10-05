import { Exclude, Expose, Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { ComicPageDto } from 'src/comic-page/entities/comic-page.dto';
import { IsEmptyOrUrl } from 'src/decorators/IsEmptyOrUrl';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { Presignable } from 'src/types/presignable';

@Exclude()
export class ComicIssueDto extends Presignable<ComicIssueDto> {
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
  @IsOptional()
  @Type(() => ComicPageDto)
  pages?: ComicPageDto[];

  @Expose()
  @ArrayUnique()
  @Type(() => String)
  @Transform(({ obj }) => obj.nfts.map((nft) => nft.mint))
  hashlist: string[];

  protected async presign(): Promise<ComicIssueDto> {
    return await super.presign(this, ['cover', 'soundtrack']);
  }

  static async presignUrls(input: ComicIssueDto): Promise<ComicIssueDto>;
  static async presignUrls(input: ComicIssueDto[]): Promise<ComicIssueDto[]>;
  static async presignUrls(
    input: ComicIssueDto | ComicIssueDto[],
  ): Promise<ComicIssueDto | ComicIssueDto[]> {
    if (Array.isArray(input)) {
      return await Promise.all(
        input.map((obj) => {
          if (obj.pages) ComicPageDto.presignUrls(obj.pages);
          return obj.presign();
        }),
      );
    } else {
      if (input.pages) ComicPageDto.presignUrls(input.pages);
      return await input.presign();
    }
  }
}
