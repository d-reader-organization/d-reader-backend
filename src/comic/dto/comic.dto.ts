import { Exclude, Expose, Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ComicIssueDto } from 'src/comic-issue/dto/comic-issue.dto';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { CreatorDto } from 'src/creator/dto/creator.dto';
import { IsEmptyOrUrl } from 'src/decorators/IsEmptyOrUrl';
import { Presignable } from 'src/types/presignable';
import { ComicStatsDto } from './comic-stats.dto';
import { WalletComicDto } from './wallet-comic.dto';

@Exclude()
export class ComicDto extends Presignable<ComicDto> {
  @Expose()
  @IsString()
  name: string;

  @Expose()
  @IsKebabCase()
  slug: string;

  @Expose()
  @IsBoolean()
  isOngoing: boolean;

  @Expose()
  @IsBoolean()
  isMatureAudience: boolean;

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
  @Transform(({ obj }) => !!obj.popularizedAt)
  isPopular: boolean;

  @Expose()
  @Transform(({ obj }) => !!obj.completedAt)
  isCompleted: boolean;

  @Expose()
  @IsString()
  cover: string;

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
  tikTok: string;

  @Expose()
  @IsEmptyOrUrl()
  youTube: string;

  @Expose()
  @IsArray()
  @IsOptional()
  @Type(() => String)
  @Transform(({ obj }) => obj.genres?.map((genre) => genre.name))
  genres?: string[];

  @Expose()
  @IsOptional()
  @Type(() => ComicStatsDto)
  stats?: ComicStatsDto;

  @Expose()
  @IsOptional()
  @Type(() => WalletComicDto)
  myStats?: WalletComicDto;

  @Expose()
  @IsArray()
  @IsOptional()
  @Type(() => ComicIssueDto)
  issues?: ComicIssueDto[];

  @Expose()
  @IsOptional()
  @Type(() => CreatorDto)
  creator?: CreatorDto;

  @Expose()
  @IsOptional()
  @IsNumber()
  issuesCount?: number | null;

  @Expose()
  @IsOptional()
  @IsNumber()
  favouritesCount?: number | null;

  protected async presign(): Promise<ComicDto> {
    return await super.presign(this, ['cover', 'logo', 'pfp']);
  }

  static async presignUrls(input: ComicDto): Promise<ComicDto>;
  static async presignUrls(input: ComicDto[]): Promise<ComicDto[]>;
  static async presignUrls(
    input: ComicDto | ComicDto[],
  ): Promise<ComicDto | ComicDto[]> {
    if (Array.isArray(input)) {
      return await Promise.all(
        input.map(async (obj) => {
          if (obj.issues) {
            obj.issues = await ComicIssueDto.presignUrls(obj.issues);
          }
          if (obj.creator) {
            obj.creator = await CreatorDto.presignUrls(obj.creator);
          }
          return obj.presign();
        }),
      );
    } else {
      if (input.issues) {
        input.issues = await ComicIssueDto.presignUrls(input.issues);
      }
      if (input.creator) {
        input.creator = await CreatorDto.presignUrls(input.creator);
      }
      return await input.presign();
    }
  }
}
