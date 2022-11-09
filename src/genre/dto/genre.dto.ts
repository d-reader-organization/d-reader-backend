import { Exclude, Expose, Transform } from 'class-transformer';
import { IsHexColor, IsNumber, IsString } from 'class-validator';
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
  icon: string;

  @Expose()
  @IsHexColor()
  color: string;

  @Expose()
  @IsNumber()
  priority: number;

  @Expose()
  @Transform(({ obj }) => !!obj.deletedAt)
  isDeleted: boolean;

  protected async presign(): Promise<GenreDto> {
    return await super.presign(this, ['icon']);
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
