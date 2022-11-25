import { plainToInstance, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { getReadUrl } from 'src/aws/s3client';
import { ComicPageDto } from 'src/comic-page/entities/comic-page.dto';
import { ComicDto } from 'src/comic/dto/comic.dto';
import { CreatorDto } from 'src/creator/dto/creator.dto';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { getRandomFloatOrInt, getRandomInt } from 'src/utils/helpers';
import { ComicIssueStatsDto } from './comic-issue-stats.dto';
import { ComicIssueStats } from 'src/comic/types/comic-issue-stats';
import {
  ComicIssue,
  Creator,
  Comic,
  ComicPage,
  ComicIssueNft,
} from '@prisma/client';
import { PickType } from '@nestjs/swagger';

class PartialComicDto extends PickType(ComicDto, [
  'name',
  'slug',
  'isMatureAudience',
]) {}
class PartialComicPageDto extends PickType(ComicPageDto, ['id', 'image']) {}
class PartialCreatorDto extends PickType(CreatorDto, [
  'name',
  'slug',
  'isVerified',
  'avatar',
]) {}

export class ComicIssueDto {
  @IsPositive()
  id: number;

  @IsPositive()
  number: number;

  @IsNotEmpty()
  title: string;

  @IsNotEmpty()
  @IsKebabCase()
  slug: string;

  @IsString()
  description: string;

  @IsString()
  flavorText: string;

  @IsString()
  cover: string;

  @IsString()
  soundtrack: string;

  @IsDateString()
  releaseDate: string;

  @IsBoolean()
  isPublished: boolean;

  @IsBoolean()
  isPopular: boolean;

  @IsBoolean()
  isDeleted: boolean;

  @IsBoolean()
  isVerified: boolean;

  @IsOptional()
  @Type(() => PartialCreatorDto)
  creator?: PartialCreatorDto;

  @IsOptional()
  @Type(() => PartialComicDto)
  comic?: PartialComicDto;

  @IsOptional()
  @Type(() => ComicIssueStatsDto)
  stats?: ComicIssueStatsDto;

  @IsArray()
  @IsOptional()
  @Type(() => PartialComicPageDto)
  pages?: PartialComicPageDto[];

  @IsOptional()
  @ArrayUnique()
  @Type(() => String)
  hashlist?: string[];
}

type ComicIssueInput = ComicIssue & {
  comic?: Comic & { creator?: Creator };
  pages?: ComicPage[];
  nfts?: ComicIssueNft[];
  stats?: ComicIssueStats;
};

export async function toComicIssueDto(issue: ComicIssueInput) {
  const plainComicIssueDto: ComicIssueDto = {
    id: issue.id,
    number: issue.number,
    title: issue.title,
    slug: issue.slug,
    description: issue.description,
    flavorText: issue.flavorText,
    cover: await getReadUrl(issue.cover),
    soundtrack: await getReadUrl(issue.soundtrack),
    releaseDate: issue.releaseDate.toISOString(),
    isPublished: !!issue.publishedAt,
    isPopular: !!issue.popularizedAt,
    isDeleted: !!issue.deletedAt,
    isVerified: !!issue.verifiedAt,
    creator: issue?.comic?.creator
      ? {
          name: issue.comic.creator.name,
          slug: issue.comic.creator.slug,
          isVerified: !!issue.comic.creator.verifiedAt,
          avatar: await getReadUrl(issue.comic.creator.avatar),
        }
      : undefined,
    comic: issue?.comic
      ? {
          name: issue.comic.name,
          slug: issue.comic.slug,
          isMatureAudience: issue.comic.isMatureAudience,
        }
      : undefined,
    stats:
      // TODO v1: replace these stats with real data and remove '|| true'
      issue?.stats || true
        ? {
            floorPrice: getRandomFloatOrInt(1, 20),
            totalSupply: getRandomInt(1, 10) * 100,
            totalVolume: getRandomFloatOrInt(1, 1000),
            totalIssuesCount: getRandomInt(6, 14),
          }
        : undefined,
    pages: issue.pages?.map((page) => ({
      id: page.id,
      pageNumber: page.pageNumber,
      image: page.image,
    })),
    hashlist: issue.nfts?.map((nft) => nft.mint),
  };

  const issueDto = plainToInstance(ComicIssueDto, plainComicIssueDto);
  return issueDto;
}

export const toComicIssueDtoArray = (issues: ComicIssueInput[]) => {
  return Promise.all(issues.map(toComicIssueDto));
};
