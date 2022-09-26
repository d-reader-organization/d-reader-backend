import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { IsArray, IsPositive, IsString } from 'class-validator';
import { ComicIssueDto } from 'src/comic-issue/dto/comic-issue.dto';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { CreatorDto } from 'src/creator/dto/creator.dto';
import { getReadUrl } from 'src/aws/s3client';
import { IsEmptyOrUrl } from 'src/decorators/IsEmptyOrUrl';

@Exclude()
export class ComicDto {
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
  @Type(() => ComicIssueDto)
  issues: ComicIssueDto[];

  @Expose()
  @Type(() => CreatorDto)
  creator: CreatorDto;

  // presignUrls = async () => {
  //   // Serial
  //   // this.thumbnail = await getReadUrl(this.thumbnail);
  //   // this.pfp = await getReadUrl(this.pfp);
  //   // this.logo = await getReadUrl(this.logo);

  //   // Parallel
  //   await Promise.all([
  //     async () => (this.thumbnail = await getReadUrl(this.thumbnail)),
  //     async () => (this.pfp = await getReadUrl(this.pfp)),
  //     async () => (this.logo = await getReadUrl(this.logo)),
  //   ]);

  //   return this;
  // };

  static async presignUrls(input: ComicDto): Promise<ComicDto>;
  static async presignUrls(input: ComicDto[]): Promise<ComicDto[]>;
  static async presignUrls(
    input: ComicDto | ComicDto[],
  ): Promise<ComicDto | ComicDto[]> {
    if (Array.isArray(input)) {
      input = await Promise.all(
        input.map(async (obj) => {
          await Promise.all([
            async () => (obj.thumbnail = await getReadUrl(obj.thumbnail)),
            async () => (obj.pfp = await getReadUrl(obj.pfp)),
            async () => (obj.logo = await getReadUrl(obj.logo)),
          ]);
          return obj;
        }),
      );
      return input;
    } else {
      input.thumbnail = await getReadUrl(input.thumbnail);
      input.pfp = await getReadUrl(input.pfp);
      input.logo = await getReadUrl(input.logo);
      return input;
    }
  }
}
