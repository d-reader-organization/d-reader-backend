import { Exclude, Expose, Transform } from 'class-transformer';
import { IsString } from 'class-validator';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { Presignable } from 'src/types/presignable';

@Exclude()
export class GenreDto extends Presignable<GenreDto> {
  @Expose()
  @IsString()
  name: string;

  @Expose()
  @IsKebabCase()
  slug: string;

  @Expose()
  @IsString()
  image: string;

  @Expose()
  @Transform(({ obj }) => !!obj.deletedAt)
  isDeleted: boolean;

  protected async presign(): Promise<GenreDto> {
    return await super.presign(this, ['image']);
  }

  static async presignUrls(input: GenreDto): Promise<GenreDto>;
  static async presignUrls(input: GenreDto[]): Promise<GenreDto[]>;
  static async presignUrls(
    input: GenreDto | GenreDto[],
  ): Promise<GenreDto | GenreDto[]> {
    if (Array.isArray(input)) {
      return await Promise.all(input.map((obj) => obj.presign()));
    } else return await input.presign();
  }
}
