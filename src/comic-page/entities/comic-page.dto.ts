import { Exclude, Expose } from 'class-transformer';
import { IsBoolean, IsPositive, IsString, IsNotEmpty } from 'class-validator';
import { getReadUrl } from 'src/aws/s3client';

@Exclude()
export class ComicPageDto {
  @Expose()
  @IsPositive()
  id: number;

  @Expose()
  @IsPositive()
  pageNumber: number;

  @Expose()
  @IsBoolean()
  isPreviewable: boolean;

  @Expose()
  @IsString()
  @IsNotEmpty()
  image: string;

  @Expose()
  @IsString()
  altImage: string;

  @Expose()
  @IsPositive()
  comicIssueId: number;

  // @Expose()
  // @Type(() => ComicIssueDto)
  // comicIssue: ComicIssueDto;

  // presignUrls = async () => {
  //   // Serial
  //   // this.image = await getReadUrl(this.image);
  //   // this.altImage = await getReadUrl(this.altImage);

  //   // Parallel
  //   await Promise.all([
  //     async () => (this.image = await getReadUrl(this.image)),
  //     async () => (this.altImage = await getReadUrl(this.altImage)),
  //   ]);

  //   return this;
  // };

  static async presignUrls(input: ComicPageDto): Promise<ComicPageDto>;
  static async presignUrls(input: ComicPageDto[]): Promise<ComicPageDto[]>;
  static async presignUrls(
    input: ComicPageDto | ComicPageDto[],
  ): Promise<ComicPageDto | ComicPageDto[]> {
    if (Array.isArray(input)) {
      input = await Promise.all(
        input.map(async (obj) => {
          await Promise.all([
            async () => (obj.image = await getReadUrl(obj.image)),
            async () => (obj.altImage = await getReadUrl(obj.altImage)),
          ]);
          return obj;
        }),
      );
      return input;
    } else {
      input.image = await getReadUrl(input.image);
      input.altImage = await getReadUrl(input.altImage);
      return input;
    }
  }
}
