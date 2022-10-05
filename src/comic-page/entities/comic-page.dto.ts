import { Exclude, Expose } from 'class-transformer';
import { IsBoolean, IsPositive, IsString, IsNotEmpty } from 'class-validator';
import { Presignable } from 'src/types/presignable';

@Exclude()
export class ComicPageDto extends Presignable<ComicPageDto> {
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

  protected async presign(): Promise<ComicPageDto> {
    return await super.presign(this, ['image', 'altImage']);
  }

  static async presignUrls(input: ComicPageDto): Promise<ComicPageDto>;
  static async presignUrls(input: ComicPageDto[]): Promise<ComicPageDto[]>;
  static async presignUrls(
    input: ComicPageDto | ComicPageDto[],
  ): Promise<ComicPageDto | ComicPageDto[]> {
    if (Array.isArray(input)) {
      return await Promise.all(input.map((obj) => obj.presign()));
    } else return await input.presign();
  }
}
