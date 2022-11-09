import { Exclude, Expose, Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { ComicPageDto } from 'src/comic-page/entities/comic-page.dto';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { Presignable } from 'src/types/presignable';

@Exclude()
export class ComicIssueDto extends Presignable<ComicIssueDto> {
  @Expose()
  @IsPositive()
  id: number;

  @Expose()
  @IsPositive()
  number: number;

  @Expose()
  @IsNotEmpty()
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
  @IsDateString()
  releaseDate: string;

  @Expose()
  @Transform(({ obj }) => !!obj.publishedAt)
  isPublished: boolean;

  @Expose()
  @Transform(({ obj }) => !!obj.popularizedAt)
  isPopular: boolean;

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
  @IsOptional()
  @ArrayUnique()
  @Type(() => String)
  @Transform(({ obj }) => obj.nfts?.map((nft) => nft.mint))
  hashlist?: string[];

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
        input.map(async (obj) => {
          if (obj.pages) obj.pages = await ComicPageDto.presignUrls(obj.pages);
          return obj.presign();
        }),
      );
    } else {
      if (input.pages) {
        input.pages = await ComicPageDto.presignUrls(input.pages);
        return await input.presign();
      }
    }
  }
}
