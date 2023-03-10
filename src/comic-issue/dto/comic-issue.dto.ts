import { plainToInstance, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { getReadUrl } from 'src/aws/s3client';
import { ComicDto } from 'src/comic/dto/comic.dto';
import { CreatorDto } from 'src/creator/dto/creator.dto';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { ComicIssueStatsDto } from './comic-issue-stats.dto';
import { ComicIssueStats } from 'src/comic/types/comic-issue-stats';
import { WalletComicIssueDto } from './wallet-comic-issue.dto';
import { PickType } from '@nestjs/swagger';
import {
  ComicIssue,
  Creator,
  Comic,
  ComicPage,
  WalletComicIssue,
} from '@prisma/client';

class PartialComicDto extends PickType(ComicDto, [
  'name',
  'slug',
  'isMatureAudience',
]) {}
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

  @Min(0)
  supply: number;

  @Min(0)
  discountMintPrice: number;

  @Min(0)
  mintPrice: number;

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
  isFree: boolean;

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

  @IsOptional()
  @Type(() => WalletComicIssueDto)
  myStats?: WalletComicIssueDto;

  @IsOptional()
  @IsString()
  candyMachineAddress?: string;
}

type ComicIssueInput = ComicIssue & {
  comic?: Comic & { creator?: Creator };
  pages?: ComicPage[];
  stats?: ComicIssueStats;
  myStats?: WalletComicIssue & { canRead: boolean };
  candyMachineAddress?: string;
};

export async function toComicIssueDto(issue: ComicIssueInput) {
  const plainComicIssueDto: ComicIssueDto = {
    id: issue.id,
    number: issue.number,
    supply: issue.supply,
    discountMintPrice: issue.discountMintPrice,
    mintPrice: issue.mintPrice,
    title: issue.title,
    slug: issue.slug,
    description: issue.description,
    flavorText: issue.flavorText,
    cover: await getReadUrl(issue.cover),
    soundtrack: await getReadUrl(issue.soundtrack),
    releaseDate: issue.releaseDate.toISOString(),
    // if supply is 0 it's not an NFT collection and therefore it's free
    isFree: issue.supply === 0,
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
    stats: issue.stats,
    myStats: issue.myStats
      ? {
          rating: issue.myStats.rating,
          isFavourite: issue.myStats.isFavourite,
          canRead: issue.myStats.canRead,
          readAt: issue.myStats.readAt,
          viewedAt: issue.myStats.viewedAt,
        }
      : undefined,
    candyMachineAddress: issue.candyMachineAddress ?? undefined,
  };

  const issueDto = plainToInstance(ComicIssueDto, plainComicIssueDto);
  return issueDto;
}

export const toComicIssueDtoArray = (issues: ComicIssueInput[]) => {
  return Promise.all(issues.map(toComicIssueDto));
};
