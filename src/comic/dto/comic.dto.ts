import { Exclude, Expose, Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ComicIssueDto } from 'src/comic-issue/dto/comic-issue.dto';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { ApiProperty } from '@nestjs/swagger';
import { CreatorDto } from 'src/creator/dto/creator.dto';
import { getReadUrl } from 'src/aws/s3client';

@Exclude()
export class ComicDto {
  @Expose()
  @IsPositive()
  id: number;

  @Expose()
  @IsNotEmpty()
  @MaxLength(54)
  name: string;

  @Expose()
  @IsNotEmpty()
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
  @MaxLength(256)
  @IsOptional()
  @ValidateIf((p) => p.description !== '')
  @ApiProperty({ required: false })
  description: string;

  @Expose()
  @MaxLength(128)
  @IsOptional()
  @ValidateIf((p) => p.flavorText !== '')
  @ApiProperty({ required: false })
  flavorText: string;

  @Expose()
  @IsUrl()
  @IsOptional()
  @ValidateIf((p) => p.website !== '')
  @ApiProperty({ required: false })
  website: string;

  @Expose()
  @IsUrl()
  @IsOptional()
  @ValidateIf((p) => p.twitter !== '')
  @ApiProperty({ required: false })
  twitter: string;

  @Expose()
  @IsUrl()
  @IsOptional()
  @ValidateIf((p) => p.discord !== '')
  @ApiProperty({ required: false })
  discord: string;

  @Expose()
  @IsUrl()
  @IsOptional()
  @ValidateIf((p) => p.telegram !== '')
  @ApiProperty({ required: false })
  telegram: string;

  @Expose()
  @IsUrl()
  @IsOptional()
  @ValidateIf((p) => p.instagram !== '')
  @ApiProperty({ required: false })
  instagram: string;

  @Expose()
  @IsUrl()
  @IsOptional()
  @ValidateIf((p) => p.medium !== '')
  @ApiProperty({ required: false })
  medium: string;

  @Expose()
  @IsUrl()
  @IsOptional()
  @ValidateIf((p) => p.tikTok !== '')
  @ApiProperty({ required: false })
  tikTok: string;

  @Expose()
  @IsUrl()
  @IsOptional()
  @ValidateIf((p) => p.youTube !== '')
  @ApiProperty({ required: false })
  youTube: string;

  @Expose()
  @IsUrl()
  @IsOptional()
  @ValidateIf((p) => p.magicEden !== '')
  @ApiProperty({ required: false })
  magicEden: string;

  @Expose()
  @IsUrl()
  @IsOptional()
  @ValidateIf((p) => p.openSea !== '')
  @ApiProperty({ required: false })
  openSea: string;

  @Expose()
  @IsArray()
  @Type(() => ComicIssueDto)
  issues: ComicIssueDto[];

  @Expose()
  @IsArray()
  @Type(() => CreatorDto)
  creator: CreatorDto;

  presignUrls = async () => {
    // Serial
    // this.thumbnail = await getReadUrl(this.thumbnail);
    // this.pfp = await getReadUrl(this.pfp);
    // this.logo = await getReadUrl(this.logo);

    // Parallel
    await Promise.all([
      async () => (this.thumbnail = await getReadUrl(this.thumbnail)),
      async () => (this.pfp = await getReadUrl(this.pfp)),
      async () => (this.logo = await getReadUrl(this.logo)),
    ]);

    return this;
  };

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
