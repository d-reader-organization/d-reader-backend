import { Exclude, Expose, Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { ComicIssueDto } from 'src/comic-issue/dto/comic-issue.dto';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { CreatorDto } from 'src/creator/dto/creator.dto';
import { IsEmptyOrUrl } from 'src/decorators/IsEmptyOrUrl';
import { Presignable } from 'src/types/presignable';

@Exclude()
export class ComicDto extends Presignable<ComicDto> {
  @Expose()
  @IsPositive()
  id: number;

  @Expose()
  @IsString()
  name: string;

  @Expose()
  @IsKebabCase()
  slug: string;

  @Expose()
  @IsPositive()
  @IsOptional()
  rating: number | null;

  @Expose()
  @IsBoolean()
  isOngoing: boolean;

  @Expose()
  @Transform(({ obj }) => !!obj.deletedAt)
  isDeleted: boolean;

  @Expose()
  @Transform(({ obj }) => !!obj.verifiedAt)
  isVerified: boolean;

  @Expose()
  @Transform(({ obj }) => !!obj.publishedAt)
  isPublished: boolean;

  @Expose()
  @IsString()
  thumbnail: string;

  @Expose()
  @IsString()
  pfp: string;

  @Expose()
  @IsString()
  logo: string;

  @Expose()
  @IsString()
  description: string;

  @Expose()
  @IsString()
  flavorText: string;

  @Expose()
  @IsEmptyOrUrl()
  website: string;

  @Expose()
  @IsEmptyOrUrl()
  twitter: string;

  @Expose()
  @IsEmptyOrUrl()
  discord: string;

  @Expose()
  @IsEmptyOrUrl()
  telegram: string;

  @Expose()
  @IsEmptyOrUrl()
  instagram: string;

  @Expose()
  @IsEmptyOrUrl()
  medium: string;

  @Expose()
  @IsEmptyOrUrl()
  tikTok: string;

  @Expose()
  @IsEmptyOrUrl()
  youTube: string;

  @Expose()
  @IsEmptyOrUrl()
  magicEden: string;

  @Expose()
  @IsEmptyOrUrl()
  openSea: string;

  @Expose()
  @IsArray()
  @Type(() => String)
  @Transform(({ obj }) => obj.genres.map((genre) => genre.name))
  genres: string[];

  @Expose()
  @IsArray()
  @IsOptional()
  @Type(() => ComicIssueDto)
  issues?: ComicIssueDto[];

  @Expose()
  @IsOptional()
  @Type(() => CreatorDto)
  creator?: CreatorDto;

  protected async presign(): Promise<ComicDto> {
    return await super.presign(this, ['thumbnail', 'logo', 'pfp']);
  }

  static async presignUrls(input: ComicDto): Promise<ComicDto>;
  static async presignUrls(input: ComicDto[]): Promise<ComicDto[]>;
  static async presignUrls(
    input: ComicDto | ComicDto[],
  ): Promise<ComicDto | ComicDto[]> {
    if (Array.isArray(input)) {
      return await Promise.all(
        input.map((obj) => {
          if (obj.issues) ComicIssueDto.presignUrls(obj.issues);
          if (obj.creator) CreatorDto.presignUrls(obj.creator);
          return obj.presign();
        }),
      );
    } else {
      if (input.issues) ComicIssueDto.presignUrls(input.issues);
      if (input.creator) CreatorDto.presignUrls(input.creator);
      return await input.presign();
    }
  }
}
