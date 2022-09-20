import { Exclude, Expose, Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ComicIssueDto } from 'src/comic-issue/dto/comic-issue.dto';
// import { Creator } from 'src/creator/entities/creator.entity';
import { IsSnakeCase } from 'src/decorators/IsSnakeCase';
import { ApiProperty } from '@nestjs/swagger';
import { CreatorDto } from 'src/creator/dto/creator.dto';

@Exclude()
export class ComicDto {
  @Expose()
  @IsPositive()
  id: number;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @MaxLength(54)
  name: string;

  @Expose()
  @IsNotEmpty()
  @IsSnakeCase()
  slug: string;

  // @Expose()
  // @IsOptional()
  // @Type(() => Date)
  // deletedAt: Date | null;

  @Expose()
  @Transform(({ obj }) => !!obj.deletedAt)
  isDeleted: boolean;

  // @Expose()
  // @IsOptional()
  // @Type(() => Date)
  // verifiedAt: Date | null;

  @Expose()
  @Transform(({ obj }) => !!obj.verifiedAt)
  isVerified: boolean;

  // @Expose()
  // @IsOptional()
  // @Type(() => Date)
  // publishedAt: Date | null;

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
  @MaxLength(256)
  @IsOptional()
  @ValidateIf((p) => p.description !== '')
  @ApiProperty({ required: false })
  description: string;

  @Expose()
  @IsString()
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
  @Type(() => ComicIssueDto)
  issues: ComicIssueDto[];

  @Expose()
  @Type(() => CreatorDto)
  creator: CreatorDto;
}
